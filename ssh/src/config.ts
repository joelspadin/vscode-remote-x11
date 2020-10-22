import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import * as vscode from 'vscode';

export const DefaultTimeout = 5;
export const DefaultDisplayCommand = 'bash -c "echo DISPLAY=$DISPLAY"';
export const DefaultSshConfig = '~/.ssh/config';

export type AuthenticationMethod = 'agent' | 'keyFile';

export function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

export function getDisplay(): number {
	return getConfig('display', 0);
}

export function getScreen(): number {
	return getConfig('screen', 0);
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

export function getJumpHost(): string | null {
	return getConfig('SSH.jumpHost', null);
}

export function getPreferConfig(): boolean {
	return getConfig('SSH.preConfig', false);
}

export function getSshConfig(): string {
	return getConfig('SSH.sshConfig', DefaultSshConfig);
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

export function resolveHome(file: string): string {
	if (file === '~') {
		return os.homedir();
	}

	if (file.startsWith('~/') || file.startsWith('~\\')) {
		return path.join(os.homedir(), file.slice(2));
	}

	return file;
}
