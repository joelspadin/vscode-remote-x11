import * as vscode from 'vscode';

const DEFAULT_EXTRA_VARIABLES = ['LIBGL_ALWAYS_INDIRECT=1'];

export class VariableError extends Error {}

export function getConfig<T>(name: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration('remoteX11');
    return config.get(name, defaultValue);
}

export function getDisplay(host: string): string {
    return `${host}:${getConfig('display', 0)}.${getConfig('screen', 0)}`;
}

export function getExtraVariables(): Map<string, string> {
    const variables = new Map<string, string>();

    for (const line of getConfig('extraVariables', DEFAULT_EXTRA_VARIABLES)) {
        const match = line.match(/(\w+)\s*=(.*)/);
        if (!match) {
            throw new VariableError(
                `Remote X11: Extra Variables item "${line}" is invalid. Item must be of the form "NAME=VALUE"`,
            );
        }

        const name = match[1];
        const value = match[2];
        variables.set(name.trim(), value.trim());
    }

    return variables;
}
