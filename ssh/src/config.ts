import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const DefaultTimeout = 3;

export function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

export function getDisplay() {
	return getConfig('display', 0);
}

export function getScreen() {
	return getConfig('screen', 0);
}

export function getPrivateKey() {
	return resolveHome(getConfig('SSH.privateKey', '~/.ssh/id_rsa'));
}

export function getTimeout() {
	return getConfig('SSH.timeout', DefaultTimeout);
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
