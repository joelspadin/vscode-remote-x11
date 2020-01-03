import * as fs from 'fs';
import { Socket } from 'net';
import * as os from 'os';
import * as path from 'path';
import { Client, X11Options } from 'ssh2';
import * as vscode from 'vscode';

import { Logger } from './logger';

interface ConnectOptions {
	host: string;
	username: string;
	port?: number;
}

const TIMEOUT = 3000;
const BASE_PORT = 6000;

const logger = new Logger('Remote X11 (SSH)');
const conn = new Client();

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('remote-x11-ssh.connect', async (options: ConnectOptions) => {
		return await createForwardedDisplay(conn, options);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	conn.end();
}

function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

function getPrivateKey() {
	return resolveHome(getConfig('SSH.privateKey', '~/.ssh/id_rsa'));
}

function getDisplay() {
	return getConfig('display', 0);
}

function getScreen() {
	return getConfig('screen', 0);
}

function resolveHome(file: string) {
	if (file === '~') {
		return os.homedir();
	}

	if (file.startsWith('~/') || file.startsWith('~\\')) {
		return path.join(os.homedir(), file.slice(2));
	}

	return file;
}

function createForwardedDisplay(conn: Client, options: ConnectOptions): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		initForwarding(conn);

		conn.on('ready', () => {
			// Create an interactive shell with X11 forwarding and leave it open
			// as long as VS Code is running so that we can point VS Code to its
			// display.
			const x11: X11Options = {
				single: false,
				screen: getScreen(),
			};

			logger.log('Connection ready. Setting up display...');

			conn.shell({ x11 }, (err, stream) => {
				if (err) {
					throw err;
				}

				let output: string = '';

				// Reject if we don't get a response in a reasonable time.
				let timeout = setTimeout(() => {
					logger.log('...timed out.');
					reject(new Error(`Couldn't get forwarded display:\n${output}`));
				}, TIMEOUT);

				// Look for the "echo $DISPLAY" command and its response.
				const onData = (data: Buffer) => {
					output += data.toString('utf8');

					const match = output.match(/echo \$DISPLAY\r?\n^([a-zA-Z0-9][a-zA-Z0-9.-]*:\d+(\.\d+)?)$/m);
					if (match) {
						stream.removeListener('data', onData);
						clearTimeout(timeout);

						const display = match[1];
						logger.log(`Display ready: ${display}`);
						resolve(display);
					}
				};

				stream.on('data', onData);
				stream.write('echo $DISPLAY\n');
			});
		});

		conn.on('error', err => {
			reject(err);
		});

		connect(conn, options);
	});
}

function initForwarding(conn: Client) {
	conn.on('x11', (info, accept, reject) => {
		// TODO: handle authentication here?
		logger.log(`x11 accept: ${info.srcIP}`);

		const xserversock = new Socket();
		xserversock.on('connect', () => {
			const xclientsock = accept();
			xclientsock.pipe(xserversock).pipe(xclientsock);
		});

		xserversock.connect(BASE_PORT + getDisplay(), 'localhost');
	});
}

function connect(conn: Client, options: ConnectOptions) {
	logger.log(`Connecting to ${options.username}@${options.host} port ${options.port}`);

	conn.connect({
		...options,
		privateKey: fs.readFileSync(getPrivateKey()),
	});
}
