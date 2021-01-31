import * as os from 'os';
import * as vscode from 'vscode';
import { getConfig } from './config';
import { getLogger } from './logger';
import { RemoteHandler } from './RemoteHandler';

export class SshHandler extends RemoteHandler {
    public get enabled(): boolean {
        return getConfig('SSH.enable', true);
    }

    public get displaySettings(): string[] {
        return [
            'remoteX11.display',
            'remoteX11.screen',
            'remoteX11.SSH.agent',
            'remoteX11.SSH.displayCommand',
            'remoteX11.SSH.enable',
            'remoteX11.SSH.host',
            'remoteX11.SSH.port',
            'remoteX11.SSH.privateKey',
        ];
    }

    public async getDisplay(): Promise<string | undefined> {
        const connection = process.env['SSH_CONNECTION'];

        if (!connection) {
            throw new Error("Couldn't get SSH_CONNECTION");
        }

        const parts = connection.split(' ');
        const host = stripScopeId(parts[2]);
        const port = parseInt(parts[3]);
        const username = os.userInfo().username;

        getLogger().log('Connecting with SSH. See Remote X11 (SSH) logs for more details.');

        return await vscode.commands.executeCommand<string>('remote-x11-ssh.connect', {
            host,
            port,
            username,
        });
    }
}

/**
 * Removes the scope ID from the end of an IPv6 address.
 */
export function stripScopeId(addr: string): string {
    return addr.replace(/%\w+$/, '');
}
