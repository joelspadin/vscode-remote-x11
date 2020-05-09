import * as assert from 'assert';
import { afterEach, beforeEach } from 'mocha';
import * as os from 'os';
import * as process from 'process';
import sinon = require('sinon');
import * as vscode from 'vscode';

import { activate } from '../../extension';

suite('Extension Test Suite', () => {
	beforeEach(() => {
		delete process.env['DISPLAY'];
	});

	afterEach(() => {
		sinon.restore();
	});

	test('Container: attached', async () => {
		stubRemoteName('attached-container');
		stubConfig({
			display: 1,
			screen: 2,
		});

		await activate();

		assert.equal(process.env['DISPLAY'], 'host.docker.internal:1.2');
	});

	test('Container: dev', async () => {
		stubRemoteName('dev-container');
		stubConfig({
			display: 1,
			screen: 2,
		});

		await activate();

		assert.equal(process.env['DISPLAY'], 'host.docker.internal:1.2');
	});

	test('Container: disabled', async () => {
		stubRemoteName('attached-container');
		stubConfig({
			'container.enabled': false,
		});

		await activate();

		assert.equal(process.env['DISPLAY'], undefined);
	});

	test('WSL: enabled', async () => {
		stubRemoteName('wsl');
		stubConfig({
			display: 1,
			screen: 2,
		});

		await activate();

		assert.equal(process.env['DISPLAY'], 'localhost:1.2');
	});

	test('WSL: disabled', async () => {
		stubRemoteName('wsl');
		stubConfig({
			'WSL.enabled': false,
		});

		await activate();

		assert.equal(process.env['DISPLAY'], undefined);
	});

	test('SSH: enabled', async () => {
		stubRemoteName('ssh-remote');
		stubConfig({
			display: 1,
			screen: 2,
			'SSH.displayCommand': 'fakecommand',
		});

		process.env['SSH_CONNECTION'] = 'clientaddr 1234 serveraddr 5678';

		sinon.stub(os, 'userInfo').returns({
			gid: 8765,
			homedir: '',
			shell: 'turtle',
			uid: 4321,
			username: 'fakeuser',
		});

		const stub = sinon
			.stub(vscode.commands, 'executeCommand')
			.withArgs('remote-x11-ssh.connect', {
				host: 'serveraddr',
				port: 5678,
				username: 'fakeuser',
				displayCommand: 'fakecommand',
			})
			.resolves('localhost:1.2');

		await activate();

		assert(stub.called);
		assert.equal(process.env['DISPLAY'], 'localhost:1.2');
	});

	test('SSH: server config', async () => {
		stubRemoteName('ssh-remote');
		stubConfig({
			display: 1,
			screen: 2,
			'SSH.displayCommand': 'fakecommand',
			'SSH.host': 'customhost',
			'SSH.port': 42,
		});

		process.env['SSH_CONNECTION'] = 'clientaddr 1234 serveraddr 5678';

		sinon.stub(os, 'userInfo').returns({
			gid: 8765,
			homedir: '',
			shell: 'turtle',
			uid: 4321,
			username: 'fakeuser',
		});

		const stub = sinon
			.stub(vscode.commands, 'executeCommand')
			.withArgs('remote-x11-ssh.connect', {
				host: 'customhost',
				port: 42,
				username: 'fakeuser',
				displayCommand: 'fakecommand',
			})
			.resolves('localhost:1.2');

		await activate();

		assert(stub.called);
		assert.equal(process.env['DISPLAY'], 'localhost:1.2');
	});

	test('SSH: disabled', async () => {
		stubRemoteName('ssh-remote');
		stubConfig({
			'SSH.enabled': false,
		});

		const spy = sinon.spy(vscode.commands, 'executeCommand');

		await activate();

		assert(spy.neverCalledWithMatch('remote-x11-ssh.connect'));
		assert.equal(process.env['DISPLAY'], undefined);
	});
});

function stubConfig(config: Record<string, any>) {
	return sinon
		.stub(vscode.workspace, 'getConfiguration')
		.withArgs('remoteX11')
		.returns(new StubConfiguration(config));
}

function stubRemoteName(name: string) {
	return sinon.stub(vscode.env, 'remoteName').get(() => name);
}

class StubConfiguration implements vscode.WorkspaceConfiguration {
	constructor(private config: Record<string, any>) {}

	// readonly [key: string]: any;
	get<T>(section: string): T | undefined;
	get<T>(section: string, defaultValue: T): T;
	get(section: any, defaultValue?: any) {
		return this.config[section] ?? defaultValue;
	}
	has(section: string): boolean {
		return section in this.config;
	}
	inspect<T>(_section: string): undefined {
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
