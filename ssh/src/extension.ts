import * as fs from 'fs';
import { Socket } from 'net';
import { Client, ClientChannel, X11Options, X11Details, ConnectConfig } from 'ssh2';
import * as vscode from 'vscode';
import { getJumpHost, resolveHome } from './config';
const SSHConfig = require('ssh-config')

import {
	getScreen,
	getDisplay,
	getTimeout,
	getAgent,
	getAuthenticationMethod,
	getPrivateKey,
	isVerboseLoggingEnabled,
	getServerHost,
	getServerPort,
	getDisplayCommand,
	getPreferConfig,
	getSshConfig
} from './config';
import { Logger } from './logger';
import { withTimeout } from './timeout';

interface ConnectOptions {
	username: string;
	host: string;
	port: number;
}

const BASE_PORT = 6000;
const JUMP_FORMAT = 'user@host:port';

const logger = new Logger('Remote X11 (SSH)');
let conn: Client;

export function activate(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('remote-x11-ssh.connect', async (options: ConnectOptions) => {
		conn?.destroy();
		conn = new Client();

		try {
			return await createForwardedDisplay(conn, options);
		} catch (ex) {
			logger.log(ex);
			throw ex;
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate(): void {
	conn?.destroy();
}

function createForwardedDisplay(conn: Client, options: ConnectOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		logger.log("started");

		conn.on('x11', handleX11);

		// Create an interactive shell with X11 forwarding and leave it open
		// as long as VS Code is running so that we can point VS Code to its
		// display.
		conn.on('ready', () => {
			logger.log("Creating forwarding shell");
			resolve(createForwardingShell(conn));
		});

		conn.on('error', (err) => {
			reject(err);
		});

		const preferConfig = getPreferConfig();
		const jumpHost = getJumpHost();

		if (preferConfig) {
			logger.log("preferred");

			// const connection = process.env['SSH_CONNECTION'];
			const connection = '192.168.5.45';

			if (!connection) {
				reject("Couldn't get SSH_CONNECTION");
			}

			logger.log("reading");
			fs.readFile(resolveHome(getSshConfig()), (err, data) => { 
				if (err) {
					reject(err); // TODO: Suggest turning off prefer
				}
				try {
					logger.log(data.toString());
					const config = SSHConfig.parse(data.toString());
					logger.log(config);
					const match = config.find((line: any) => line.param == 'HostName' && line.value == connection);

					logger.log(match);

					const { username } = options;
					const host = getServerHost() || options.host;
					const port = getServerPort() || options.port;
			
					connect(conn, username, host, port);
				} catch(err) {
					reject(err);
				}
			});
		} else if (jumpHost) {
			resolve(connectViaJump(conn, options, jumpHost));
		} else {
			const { username } = options;
			const host = getServerHost() || options.host;
			const port = getServerPort() || options.port;
	
			connect(conn, username, host, port);
		}
	});
}

function connect(conn: Client, username: string, host: string, port: number): void {
	logger.log(`Connecting to ${username}@${host} port ${port}`);
	
	conn.connect({
		username,
		host,
		port,
		debug: isVerboseLoggingEnabled() ? logVerbose : undefined,
		...getAuthOptions(),
	});
}

function connectViaJump(destination: Client, destinationOptions: ConnectOptions, jumpHost: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const at = jumpHost.indexOf('@');
		const colon = jumpHost.indexOf(':');
	
		if (at < 0 || colon < 0) {
			reject(`Invalid jump host.  It should be: ${JUMP_FORMAT}`)
		}
		const jumpOptions: ConnectOptions = {
			username: jumpHost.substring(0, at),
			host: jumpHost.substring(at + 1, colon),
			port: Number(jumpHost.substring(colon + 1))
		}

		logger.log(`Connecting to ${getHostString(destinationOptions)} via ${getHostString(jumpOptions)}`);

		const jump = new Client();

		destination.on('close', () => {
			logger.log(`Closing ${getHostString(jumpOptions)} along with ${getHostString(destinationOptions)}`);
			jump.end();
		})

		logger.log(`Connecting to ${getHostString(jumpOptions)}`);
		jump
			.on('ready', () => {
				jump.forwardOut('127.0.0.1', 12345, destinationOptions.host, destinationOptions.port, (err, stream) => {
					if (err) {
						reject(err);
						return jump.end();
					}
					logger.log(`Connecting to ${getHostString(destinationOptions)}`);
					destination.connect({
						sock: stream,
						...getConnectConfig(destinationOptions)
					});
				});
			})
			.on('error', (err) => {
				reject(err);
			})
			.connect(getConnectConfig(jumpOptions));
	});
}

function getHostString(options: ConnectOptions): string {
	return `${options.username}@${options.host} port ${options.port}`;
}

function getConnectConfig(options: ConnectOptions) {
	return {
		...options,
		debug: isVerboseLoggingEnabled() ? logVerbose : undefined,
		...getAuthOptions()
	}
}

function createForwardingShell(conn: Client): Promise<string> {
	logger.log('Connection ready. Setting up display...');

	return new Promise((resolve, reject) => {
		const x11: X11Options = {
			single: false,
			screen: getScreen(),
		};

		conn.shell({ x11 }, (err, stream) => {
			if (err) {
				reject(err);
				return;
			}

			stream.on('close', () => logger.log('Connection closed.'));

			resolve(getForwardedDisplay(stream));
		});
	});
}

function handleX11(info: X11Details, accept: () => ClientChannel) {
	logger.log(`x11 accept: ${info.srcIP}`);

	const xserversock = new Socket();

	xserversock.on('connect', () => {
		const xclientsock = accept();
		xclientsock.pipe(xserversock).pipe(xclientsock);
	});

	xserversock.connect(BASE_PORT + getDisplay(), 'localhost');
}

function getAuthOptions(): Partial<ConnectConfig> {
	const method = getAuthenticationMethod();

	switch (method) {
		case 'agent':
			logger.log(`using agent`);

			return {
				agent: getAgent(),
			};

		case 'keyFile':
			logger.log(`using private key`);

			return {
				privateKey: fs.readFileSync(getPrivateKey()),
			};

		default:
			throw new Error(`Unknown authentication method: ${method}.`);
	}
}

async function getForwardedDisplay(stream: ClientChannel): Promise<string> {
	const parser = new DisplayParser(stream);

	try {
		const command = getDisplayCommand();
		logger.log(`Echo display command is: ${command}`);
		logger.log('----- Begin output from host -----\n');

		stream.write(command);
		stream.write('\n');

		const display = await withTimeout(parser.result, getTimeout() * 1000, 'Timed out forwarding display.');

		logger.log('\n----- End output from host -----');
		logger.log(`Display ready: ${display}`);

		return display;
	} finally {
		parser.dispose();
	}
}

function logVerbose(message: string) {
	logger.log(message);
}

class DisplayParser implements vscode.Disposable {
	public readonly result: Promise<string>;

	private currentLine = '';
	private dataHandler: ((data: Buffer) => void) | undefined;
	private resolve: ((value: string) => void) | undefined;
	private reject: ((reason: any) => void) | undefined;

	constructor(private stream: ClientChannel) {
		this.result = new Promise<string>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});

		this.result.then(() => this.dispose());

		this.dataHandler = this.onData.bind(this);
		this.stream.on('data', this.dataHandler);
	}

	public dispose() {
		if (this.dataHandler) {
			this.stream.removeListener('data', this.dataHandler);
			this.dataHandler = undefined;
		}
	}

	private onData(data: Buffer) {
		const str = data.toString('utf8');
		logger.log(str, '');
		this.currentLine += str;

		const endIdx = this.currentLine.lastIndexOf('\n');

		if (endIdx < 0) {
			return;
		}

		const match = this.currentLine.match(/DISPLAY=(\S+:[\d.]+)?\r?\n/m);

		if (match) {
			const display = match[1];
			if (display) {
				this.resolve?.(display);
			} else {
				this.reject?.(new Error('DISPLAY variable is missing.'));
			}
		} else {
			this.currentLine = this.currentLine.substr(endIdx);
		}
	}
}
