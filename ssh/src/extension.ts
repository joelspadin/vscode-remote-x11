import * as fs from 'fs';
import { Socket } from 'net';
import { Client, ClientChannel, X11Options, X11Details, ConnectConfig } from 'ssh2';
import * as vscode from 'vscode';
import { getJumpHost, getJumpPort, getJumpUser, resolveHome } from './config';
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

		// Define callbacks that apply to all connection strategies
		conn.on('x11', handleX11)
			.on('ready', () => {
				// Create an interactive shell with X11 forwarding and leave it open
				// as long as VS Code is running so that we can point VS Code to its
				// display.
				logger.log("Creating forwarding shell");
				resolve(createForwardingShell(conn));
			})
			.on('error', (err) => {
				reject(err);
			});

		const preferConfig = getPreferConfig();
		const jumpHost = getJumpHost();
		let destinationOptions: ConnectOptions  = { 
			username: options.username,
			host: getServerHost() || options.host,
			port: getServerPort() || options.port
		}

		// Populate jump host falling back on server settings for user and port
		let jumpOptions: ConnectOptions | null = null;
		if (jumpHost) {
			const jumpUser = getJumpUser();
			const jumpPort = getJumpPort();
			jumpOptions = {
				username: jumpUser ? jumpUser : options.username,
				host: jumpHost,
				port: jumpPort ? jumpPort: options.port
			}
		}

		if (preferConfig) {
			const sshConfig = resolveHome(getSshConfig());
			const host = getServerHost() || options.host;

			logger.log(`Attempting to parse ${sshConfig} for ssh configuration of ${host}`);

			try {
				const data = fs.readFileSync(resolveHome(getSshConfig()))

				const config = SSHConfig.parse(data.toString());

				let hostConfig = null;
				for (const line of config) {
					if (line.param === 'Host') {
						if (line.value === host) {
							hostConfig = line.config;
							break;
						} else {
							const hostNameMatch = line.config.find((line:any) => line.param === 'HostName' && line.value === host);
							if (hostNameMatch) {
								logger.log(`${host} matches ${line.value}`);
								hostConfig = line.config;
								break;
							}
						}
					}
				}

				if (!hostConfig) {
					throw new Error(`Could not find ${host}`);
				}

				const configUser = hostConfig.find((line:any) => line.param === 'User');
				const configPort = hostConfig.find((line:any) => line.param === 'Port');
				const configHost = hostConfig.find((line:any) => line.param === 'HostName');
				const configProxy = hostConfig.find((line:any) => line.param === 'ProxyCommand');

				destinationOptions = {
					username: configUser ? configUser.value : options.username,
					port: configPort ? configPort.value : options.port,
					host: configHost ? configHost.value : options.host
				}

				// If it's set to proxy
				if (configProxy) {
					logger.log(`Attempting to parse ProxyCommand for ssh configuration of ${host}`);

					const proxyCommand: string = configProxy.value;
					// For now we just handle ssh forwards.  I don't know what other edge cases are out there
					if (proxyCommand.startsWith('ssh')) {
						const args = proxyCommand.split(' ');
						const jumpHostArg = args[args.length-1];

						// forward channel -W
						const forwardArg = args.indexOf('-W');
						if (forwardArg > 0) { 
							logger.log(`Attempting to parse forwarding for ssh configuration of ${host}`);

							const hostAndPort = args[forwardArg + 1].split(':');
							// %h is the config host, %p is the config port
							destinationOptions.host = hostAndPort[0] === '%h' ? destinationOptions.host : hostAndPort[0];
							destinationOptions.port = hostAndPort[1] === '%p' ? destinationOptions.port : Number(hostAndPort[1]);

							// Look for a defined jumpHost
							const jumpHostBlock = config.find((line:any) => line.param === 'Host' && line.value === jumpHostArg);
							if (jumpHostBlock) {
								const jumpHostNameNode = jumpHostBlock.config.find((line:any) => line.param === 'HostName');
								const jumpHost: string = jumpHostNameNode ? jumpHostNameNode.value : options.host;
								const jumpPortNode = jumpHostBlock.config.find((line:any) => line.param === 'Port');
								const jumpPort: number = jumpPortNode ? jumpPortNode.value : options.port;
								const jumpUserNode = jumpHostBlock.config.find((line:any) => line.param === 'User');
								const jumpUser: string = jumpUserNode ? jumpUserNode.value : options.username;
								jumpOptions = {
									username: jumpUser,
									port: jumpPort,
									host: jumpHost
								}
							} else {
								// port -p
								const jumpPortArg = args.indexOf('-p');
								const jumpPort = jumpPortArg > 0 ? Number(args[jumpPortArg + 1]) : 22;

								// username@host (username optional)
								const jumpUserAndHost = jumpHostArg.split('@');
								const jumpUser = jumpUserAndHost.length > 1 ? jumpUserAndHost[0]: options.username;
								const jumpHost = jumpUserAndHost[jumpUserAndHost.length-1];

								jumpOptions = {
									username: jumpUser,
									port: jumpPort,
									host: jumpHost
								}
							}
						}
					} else {
						throw new Error('We currently only support ssh in ProxyCommand.');
					}
				}
			} catch(err) {
				logger.log(`Failed to process ${sshConfig}:\n\t${err}\n\tAttempting to use extension settings.`);
			}
		}


		if (jumpOptions) {
			logger.log(`Connecting to ${getHostString(destinationOptions)} via ${getHostString(jumpOptions)}`);
			resolve(connectViaJump(conn, options, jumpOptions));
		} else {
			logger.log(`Connecting to ${getHostString(destinationOptions)}`);
			conn.connect(getConnectConfig(destinationOptions));
		}
	});
}

function connectViaJump(destination: Client, destinationOptions: ConnectOptions, jumpOptions: ConnectOptions): Promise<string> {
	return new Promise((resolve, reject) => {

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
