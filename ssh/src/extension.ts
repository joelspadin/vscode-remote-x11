import * as fs from 'fs';
import { Socket } from 'net';
import { Client, ClientChannel, X11Options, X11Details, ConnectConfig } from 'ssh2';
import * as vscode from 'vscode';

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
} from './config';
import { Logger } from './logger';
import { withTimeout } from './timeout';

interface ConnectOptions {
	username: string;
	host: string;
	port: number;
}

const BASE_PORT = 6000;

const logger = new Logger('Remote X11 (SSH)');
let conn: Client;

export function activate(context: vscode.ExtensionContext) {
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

export function deactivate() {
	conn?.destroy();
}

function createForwardedDisplay(conn: Client, options: ConnectOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		const { username } = options;
		const host = getServerHost() || options.host;
		const port = getServerPort() || options.port;

		logger.log(`Connecting to ${username}@${host} port ${port}`);

		conn.on('x11', handleX11);

		// Create an interactive shell with X11 forwarding and leave it open
		// as long as VS Code is running so that we can point VS Code to its
		// display.
		conn.on('ready', () => {
			resolve(createForwardingShell(conn));
		});

		conn.on('error', (err) => {
			reject(err);
		});

		conn.connect({
			username,
			host,
			port,
			debug: isVerboseLoggingEnabled() ? logVerbose : undefined,
			...getAuthOptions(),
		});
	});
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
			return {
				agent: getAgent(),
			};

		case 'keyFile':
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
