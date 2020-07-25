import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import * as vscode from 'vscode';

export const DefaultTimeout = 5;
export const DefaultDisplayCommand = 'bash -c "echo DISPLAY=$DISPLAY"';

export type AuthenticationMethod = 'agent' | 'keyFile';

export function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

export function getDisplay(): number {
	const { display } = getLocalDisplay();
	return display ?? getConfig('display', 0);
}

export function getScreen(): number {
	const { screen } = getLocalDisplay();
	return screen ?? getConfig('screen', 0);
}

export function getAuthenticationMethod(): AuthenticationMethod {
	return getConfig<AuthenticationMethod>('SSH.authenticationMethod', 'keyFile');
}

export function getAgent(): string {
	return getConfig('SSH.agent', '') || getDefaultAgent();
}

export function getPrivateKey(): string {
	return resolveHome(getConfig('SSH.privateKey', '~/.ssh/id_rsa'));
}

export function getServerHost(): string | null {
	return getConfig<string | null>('SSH.host', null);
}

export function getServerPort(): number | null {
	return getConfig<number | null>('SSH.port', null);
}

export function getDisplayCommand(): string {
	return getConfig('SSH.displayCommand', DefaultDisplayCommand);
}

export function getTimeout(): number {
	return getConfig('SSH.timeout', DefaultTimeout);
}

export function isVerboseLoggingEnabled(): boolean {
	return getConfig('SSH.verboseLogging', false);
}

function getDefaultAgent(): string {
	if (os.platform() === 'win32') {
		return '\\\\.\\pipe\\openssh-ssh-agent';
	} else {
		const socket = process.env['SSH_AUTH_SOCK'];

		if (socket === undefined) {
			throw new Error('Cannot find SSH Agent. SSH_AUTH_SOCK environment variable is not set.');
		}

		return socket;
	}
}

function getLocalDisplay(): { display?: number; screen?: number } {
	const variable = process.env['DISPLAY'];
	if (variable) {
		const match = variable.match(/:(\d+)(?:(\d+))?/);
		if (match) {
			const display = parseInt(match[1]);
			const screen = parseInt(match[2] || '0');
			return { display, screen };
		}
	}
	return { display: undefined, screen: undefined };
}

function resolveHome(file: string): string {
	if (file === '~') {
		return os.homedir();
	}

	if (file.startsWith('~/') || file.startsWith('~\\')) {
		return path.join(os.homedir(), file.slice(2));
	}

	return file;
}
