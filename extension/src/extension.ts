import * as vscode from 'vscode';
import { ContainerHandler } from './ContainerHandler';
import { getLogger } from './logger';
import { RemoteHandler } from './RemoteHandler';
import { SshHandler } from './SshHandler';
import { WslHandler } from './WslHandler';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const handler = getRemoteHandler(context);

    if (handler) {
        context.subscriptions.push(handler);

        await handler.apply();
    } else {
        context.environmentVariableCollection.clear();
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('remote-x11.reconnect', async () => {
            if (handler) {
                await reconnect(handler);
            }
        }),
    );
}

export function deactivate(): void {
    // Nothing to do.
}

function getRemoteHandler(context: vscode.ExtensionContext): RemoteHandler | undefined {
    switch (vscode.env.remoteName) {
        case undefined:
            return undefined;

        case 'attached-container':
        case 'dev-container':
            return new ContainerHandler(context);

        case 'ssh-remote':
            return new SshHandler(context);

        case 'wsl':
            return new WslHandler(context);

        default:
            getLogger().log(`Unknown remote type "${vscode.env.remoteName}".`);
            return undefined;
    }
}

async function reconnect(handler: RemoteHandler) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Reconnecting X11 display...',
        },
        async () => {
            await handler.apply();
        },
    );

    vscode.window.showInformationMessage('X11 display reconnected. Terminals may need to be reloaded.');
}
