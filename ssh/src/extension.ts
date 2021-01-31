import { spawnSync } from 'child_process';
import * as commandExists from 'command-exists';
import * as fs from 'fs';
import { Socket } from 'net';
import { tmpdir } from 'os';
import * as path from 'path';
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
	getX11ConnectionMethod,
	getX11SocketPath,
	getXAuthPermissionLevel,
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

function getXAuthCookie() {
	if (!commandExists.sync('xauth')) {
		logger.log(`The xauth binary could not be located. This is normal on Windows must may indicate a problem on Linux/MacOS.`);
		return null;
	}
	let listCommand;
	if (getXAuthPermissionLevel() === 'untrusted') {
		const tmpFolder = fs.mkdtempSync(path.join(tmpdir(), 'remote-x11-'));
		const authorityFile = path.join(tmpFolder, 'xauthority');
		const generateCommand = spawnSync(
			'xauth',
			['-f', authorityFile, 'generate', `:${getDisplay()}`, 'MIT-MAGIC-COOKIE-1', 'untrusted'],
			{ windowsHide: true },
		);
		if (generateCommand.error) {
			logger.log(`xauth could not be executed due to "${generateCommand.error.message}"`);
			fs.rmdirSync(tmpFolder);
			return null;
		}
		if (generateCommand.status !== 0) {
			logger.log(`xauth errored when generating a token, "${generateCommand.stderr}"`);
			if (fs.existsSync(authorityFile)) {
				fs.unlinkSync(authorityFile);
			}
			fs.rmdirSync(tmpFolder);
			return null;
		}
		listCommand = spawnSync('xauth', ['-f', authorityFile, 'list', `:${getDisplay()}`], { windowsHide: true });
		fs.unlinkSync(authorityFile);
		fs.rmdirSync(tmpFolder);
	} else {
		listCommand = spawnSync('xauth', ['list', `:${getDisplay()}`], { windowsHide: true });
	}
	if (listCommand.error) {
		logger.log(`xauth could not be executed due to "${listCommand.error.message}"`);
		return null;
	}
	if (listCommand.status !== 0) {
		logger.log(`xauth errored when listing the token, "${listCommand.stderr}"`);
		return null;
	}
	const listOutput = listCommand.stdout.toString().trim();
	if (listOutput.length === 0) {
		logger.log(
			"xauth list didn't error but it didn't return any tokens. Are you sure you specified the right display?",
		);
		return null;
	}
	// Command output is parsed per https://github.com/openssh/openssh-portable/blob/1a14c13147618144d1798c36a588397ba9008fcc/clientloop.c#L389
	const tokens = listOutput.split(/\s+/);
	if (tokens.length !== 3 || !tokens[2].match(/[0-9a-fA-F]{32}/)) {
		logger.log(`xauth list output doesn't match expected format "${listOutput}"`);
		return null;
	}
	return tokens[2];
}

function createForwardingShell(conn: Client): Promise<string> {
	logger.log('Connection ready. Setting up display...');

	return new Promise((resolve, reject) => {
		const cookie = getXAuthCookie();
		if (cookie === null) {
			logger.log("xauth didn't supply a token, using a random one");
		}
		// The type library for ssh2 is incomplete and missing the cookie property
		const x11 = {
			single: false,
			screen: getScreen(),
			cookie: cookie ?? undefined,
		} as X11Options;

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

	const method = getX11ConnectionMethod();
	switch (method) {
		case 'tcp':
			xserversock.connect(BASE_PORT + getDisplay(), 'localhost');
			break;
		case 'unix':
			xserversock.connect(getX11SocketPath() + getDisplay());
			break;
		default:
			throw new Error(`Unknown connection method: ${method}.`);
	}
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
