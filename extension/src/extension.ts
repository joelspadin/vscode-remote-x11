import find = require('find-process');
import * as os from 'os';
import * as vscode from 'vscode';

import { Logger } from './logger';

interface RemoteHandler {
	enabled(): boolean;
	connect(): Promise<string | undefined>;
}

const logger = new Logger('Remote X11');

export async function activate(context: vscode.ExtensionContext) {
	const remote = vscode.env.remoteName;

	if (remote) {
		if (remote in remoteHandlers) {
			const handler = remoteHandlers[remote];

			if (handler.enabled()) {
				logger.log(`Setting up display for remote "${remote}".`);

				const display = await handler.connect();
				if (display) {
					await setDisplay(display);
				} else {
					logger.log(`Couldn't get display for remote "${remote}".`);
				}
			} else {
				logger.log(`Forwarding is disabled for remote "${remote}".`);
			}
		} else {
			logger.log(`No handler for remote "${remote}".`);
		}
	}
}

export function deactivate() {}

function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

function getDisplay(host: string) {
	return `${host}:${getConfig('display', 0)}.${getConfig('screen', 0)}`;
}

const containerHandler: RemoteHandler = {
	enabled: () => getConfig('container.enabled', true),

	connect: async () => {
		return Promise.resolve(getDisplay('host.docker.internal'));
	},
};

const wslHandler: RemoteHandler = {
	enabled: () => getConfig('WSL.enabled', true),

	connect: async () => {
		return Promise.resolve(getDisplay('localhost'));
	},
};

const sshHandler: RemoteHandler = {
	enabled: () => getConfig('SSH.enabled', true),

	connect: async () => {
		const connection = process.env['SSH_CONNECTION'];

		if (!connection) {
			throw new Error("Couldn't get SSH_CONNECTION");
		}

		const parts = connection.split(' ');
		const host = parts[2];
		const port = parts[3];
		const username = os.userInfo().username;

		logger.log(`Connecting to SSH ${username}@${host} ${port}`);

		return await vscode.commands.executeCommand<string>('remote-x11-ssh.connect', {
			host,
			port,
			username,
		});
	},
};

const remoteHandlers: Record<string, RemoteHandler> = {
	'ssh-remote': sshHandler,
	'attached-container': containerHandler,
	'dev-container': containerHandler,
	wsl: wslHandler,
};

async function setDisplay(display: string) {
	logger.log(`DISPLAY = ${display}`);

	process.env['DISPLAY'] = display;

	// Any terminals created before we update the environment will not have
	// DISPLAY set properly. Send a command to each to update them too.
	for (const terminal of vscode.window.terminals) {
		await setTerminalDisplay(terminal, display);
	}
}

async function setTerminalDisplay(terminal: vscode.Terminal, display: string) {
	const pid = await terminal.processId;
	if (pid === undefined) {
		return;
	}

	const list = await find('pid', pid);
	const process = list[0];
	if (process === undefined) {
		return;
	}

	const name = process.name.toLowerCase().replace('.exe', '');
	switch (name) {
		case 'bash':
		case 'sh':
		case 'ksh':
		case 'zsh':
			terminal.sendText(`export DISPLAY=${display}`);
			break;

		case 'csh':
		case 'tcsh':
			terminal.sendText(`setenv DISPLAY ${display}`);
			break;

		case 'cmd':
			terminal.sendText(`set DISPLAY=${display}`);
			break;

		default:
			logger.log(`Unknown terminal "${process.name}`);
			break;
	}
}
