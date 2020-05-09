import sinon = require('sinon');
import * as vscode from 'vscode';

export function stubConfig(config: Record<string, any>) {
	return sinon
		.stub(vscode.workspace, 'getConfiguration')
		.withArgs('remoteX11')
		.returns(new StubConfiguration(config));
}

export class StubConfiguration implements vscode.WorkspaceConfiguration {
	constructor(private config: Record<string, any>) {}

	get<T>(section: string): T | undefined;
	get<T>(section: string, defaultValue: T): T;
	get(section: any, defaultValue?: any) {
		return this.config[section] ?? defaultValue;
	}
	has(section: string): boolean {
		return section in this.config;
	}
	inspect(_section: string): undefined {
		throw new Error('Method not implemented.');
	}
	update(
		_section: string,
		_value: any,
		_configurationTarget?: boolean | vscode.ConfigurationTarget | undefined,
		_overrideInLanguage?: boolean | undefined,
	): Thenable<void> {
		throw new Error('Method not implemented.');
	}
}
