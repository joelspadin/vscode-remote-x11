import * as vscode from 'vscode';

import { getExtraVariables, VariableError } from './config';
import { getLogger } from './logger';

export abstract class RemoteHandler implements vscode.Disposable {
	private static readonly ReapplyDelayMs = 3000;

	public abstract get enabled(): boolean;

	protected disposables: vscode.Disposable[] = [];
	protected abstract get displaySettings(): string[];

	private activateTimer: NodeJS.Timeout | undefined;

	constructor(protected context: vscode.ExtensionContext) {
		vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this.disposables);
	}

	public abstract getDisplay(): Promise<string | undefined>;

	public dispose(): void {
		this.disposables.forEach((s) => s.dispose());
	}

	public async apply(): Promise<void> {
		if (!this.enabled) {
			getLogger().log(`Forwarding is disabled for remote "${vscode.env.remoteName}".`);
			this.clearEnvironment();
			return;
		}

		try {
			getLogger().log(`Setting up display for remote "${vscode.env.remoteName}".`);

			const display = await this.getDisplay();
			if (display) {
				this.updateEnvironment(display);
			} else {
				getLogger().log(`Couldn't get display for remote "${vscode.env.remoteName}".`);
				this.clearEnvironment();
			}
		} catch (ex) {
			getLogger().log(ex);
			vscode.window.showErrorMessage(`Failed to get DISPLAY: ${ex}`);

			this.clearEnvironment();
		}
	}

	protected onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent): void {
		if (!e.affectsConfiguration('remoteX11')) {
			return;
		}

		if (e.affectsConfiguration('remoteX11.extraVariables')) {
			if (this.enabled) {
				this.updateExtraVariables();
			}
		}

		// Update the DISPLAY variable if any settings that affect it change.
		// Delay this until the user stops changing settings for a few seconds
		// so we don't spam the SSH extension with requests to re-connect when
		// in on an SSH remote target.
		for (const setting of this.displaySettings) {
			if (e.affectsConfiguration(setting)) {
				this.delayedReapply();
				break;
			}
		}
	}

	private delayedReapply() {
		if (this.activateTimer) {
			clearTimeout(this.activateTimer);
		}

		this.activateTimer = setTimeout(() => {
			getLogger().log('\nConfiguration changed. Updating display...\n');
			this.apply();
		}, RemoteHandler.ReapplyDelayMs);
	}

	private clearEnvironment() {
		this.context.environmentVariableCollection.clear();
	}

	private updateEnvironment(display: string) {
		this.updateDisplay(display);
		this.updateExtraVariables();
	}

	private updateDisplay(display: string) {
		getLogger().log(`DISPLAY = ${display}`);
		this.context.environmentVariableCollection.replace('DISPLAY', display);
	}

	private updateExtraVariables() {
		try {
			const variables = getExtraVariables();

			this.context.environmentVariableCollection.forEach((name) => {
				if (name !== 'DISPLAY' && !variables.has(name)) {
					this.context.environmentVariableCollection.delete(name);
				}
			});

			for (const [name, value] of variables) {
				getLogger().log(`${name} = ${value}`);
				this.context.environmentVariableCollection.replace(name, value);
			}
		} catch (ex) {
			if (ex instanceof VariableError) {
				vscode.window.showErrorMessage(ex.message, 'Open Settings').then((result) => {
					if (result) {
						vscode.commands.executeCommand('workbench.action.openSettings', 'remoteX11.extraVariables');
					}
				});
			} else {
				vscode.window.showErrorMessage(ex.toString());
			}
		}
	}
}
