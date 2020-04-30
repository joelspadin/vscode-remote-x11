import * as fs from 'fs';
import { Socket } from 'net';
import { Client, ClientChannel, X11Options, X11Details, ConnectConfig } from 'ssh2';
import * as vscode from 'vscode';

import { getScreen, getDisplay, getTimeout, getAgent, getAuthenticationMethod, getPrivateKey } from './config';
import { Logger } from './logger';
import { withTimeout } from './timeout';

interface ConnectOptions {
	username: string;
	host: string;
	port: number;
	displayCommand: string;
}

const BASE_PORT = 6000;

const logger = new Logger('Remote X11 (SSH)');
const conn = new Client();

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('remote-x11-ssh.connect', async (options: ConnectOptions) => {
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
	conn.end();
}

function createForwardedDisplay(conn: Client, options: ConnectOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		logger.log(`Connecting to ${options.username}@${options.host} port ${options.port}`);

		conn.on('x11', handleX11);

		// Create an interactive shell with X11 forwarding and leave it open
		// as long as VS Code is running so that we can point VS Code to its
		// display.
		conn.on('ready', () => {
			resolve(createForwardingShell(conn, options));
		});

		conn.on('error', (err) => {
			reject(err);
		});

		const { username, host, port } = options;

		conn.connect({
			username,
			host,
			port,
			...getAuthOptions(),
		});
	});
}

function createForwardingShell(conn: Client, options: ConnectOptions): Promise<string> {
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

			resolve(getForwardedDisplay(stream, options));
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

async function getForwardedDisplay(stream: ClientChannel, options: ConnectOptions): Promise<string> {
	const parser = new DisplayParser(stream);

	try {
		const command = options.displayCommand;
		logger.log(`Command for host "${options.host}" is: ${command}`);
		logger.log('----- Begin output from host -----\n');

		stream.write(command);
		stream.write('\n');

		const display = await withTimeout(parser.result, getTimeout(), 'Timed out forwarding display.');

		logger.log('\n----- End output from host -----');
		logger.log(`Display ready: ${display}`);

		return display;
	} finally {
		parser.dispose();
	}
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

		this.result.then(this.dispose);

		this.dataHandler = this.onData.bind(this);
		this.stream.on('data', this.dataHandler);
	}

	public dispose() {
		if (this.dataHandler) {
			logger.log('Parser disposed.');
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
