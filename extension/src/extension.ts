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
