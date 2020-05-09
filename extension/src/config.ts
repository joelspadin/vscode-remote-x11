import * as vscode from 'vscode';

export function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

export function getDisplay(host: string) {
	return `${host}:${getConfig('display', 0)}.${getConfig('screen', 0)}`;
}
