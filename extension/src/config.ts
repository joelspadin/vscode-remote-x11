import * as vscode from 'vscode';

const DefaultDisplayCommand = 'bash -c "echo DISPLAY=$DISPLAY"';

export function getConfig<T>(name: string, defaultValue: T): T {
	const config = vscode.workspace.getConfiguration('remoteX11');
	return config.get(name, defaultValue);
}

export function getDisplay(host: string) {
	return `${host}:${getConfig('display', 0)}.${getConfig('screen', 0)}`;
}

export function getSshHost() {
	return getConfig<string | null>('SSH.host', null);
}

export function getSshPort() {
	return getConfig<number | null>('SSH.port', null);
}

export function getDisplayCommand() {
	return getConfig('SSH.displayCommand', DefaultDisplayCommand);
}
