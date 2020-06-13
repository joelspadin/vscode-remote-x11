import * as assert from 'assert';
import { afterEach, beforeEach } from 'mocha';
import * as os from 'os';
import * as process from 'process';
import sinon = require('sinon');
import * as vscode from 'vscode';

import { activate } from '../../extension';
import { stubRemoteName, stubConfig } from '../stubs';

suite('Extension Test Suite', () => {
	let context: vscode.ExtensionContext;

	beforeEach(() => {
		context = new MockContext();
	});

	afterEach(() => {
		sinon.restore();
		context.subscriptions.forEach((s) => s.dispose());
	});

	test('No remote', async () => {
		stubRemoteName(undefined);

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {});
	});

	test('Container: attached', async () => {
		stubRemoteName('attached-container');
		stubConfig({
			display: 1,
			screen: 2,
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'host.docker.internal:1.2',
			LIBGL_ALWAYS_INDIRECT: '1',
		});
	});

	test('Container: dev', async () => {
		stubRemoteName('dev-container');
		stubConfig({
			display: 1,
			screen: 2,
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'host.docker.internal:1.2',
			LIBGL_ALWAYS_INDIRECT: '1',
		});
	});

	test('Container: disabled', async () => {
		stubRemoteName('attached-container');
		stubConfig({
			'container.enable': false,
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {});
	});

	test('WSL: enabled', async () => {
		stubRemoteName('wsl');
		stubConfig({
			display: 1,
			screen: 2,
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'localhost:1.2',
			LIBGL_ALWAYS_INDIRECT: '1',
		});
	});

	test('WSL: disabled', async () => {
		stubRemoteName('wsl');
		stubConfig({
			'WSL.enable': false,
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {});
	});

	test('SSH: enabled', async () => {
		stubRemoteName('ssh-remote');
		stubConfig({
			display: 1,
			screen: 2,
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
			})
			.resolves('localhost:1.2');

		await activate(context);

		assert(stub.called);
		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'localhost:1.2',
			LIBGL_ALWAYS_INDIRECT: '1',
		});
	});

	test('SSH: disabled', async () => {
		stubRemoteName('ssh-remote');
		stubConfig({
			'SSH.enable': false,
		});

		const spy = sinon.spy(vscode.commands, 'executeCommand');

		await activate(context);

		assert(spy.neverCalledWithMatch('remote-x11-ssh.connect'));
		assert.deepStrictEqual(getVariables(context), {});
	});

	test('extraVariables', async () => {
		stubRemoteName('wsl');
		stubConfig({
			extraVariables: ['FOO=1', 'BAR = 2', ' BAZ  =3  '],
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'localhost:0.0',
			FOO: '1',
			BAR: '2',
			BAZ: '3',
		});
	});

	test('extraVariables: default', async () => {
		stubRemoteName('wsl');
		stubConfig({});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'localhost:0.0',
			LIBGL_ALWAYS_INDIRECT: '1',
		});
	});

	test('extraVariables: empty', async () => {
		stubRemoteName('wsl');
		stubConfig({
			extraVariables: [],
		});

		await activate(context);

		assert.deepStrictEqual(getVariables(context), {
			DISPLAY: 'localhost:0.0',
		});
	});
});

function getVariables(context: vscode.ExtensionContext): Record<string, string> {
	const variables: Record<string, string> = {};

	context.environmentVariableCollection.forEach((name, mutator) => {
		variables[name] = mutator.value;
	});

	return variables;
}

class MockContext implements vscode.ExtensionContext {
	public readonly subscriptions: { dispose(): any }[] = [];

	public readonly workspaceState = new MockMemento();
	public readonly globalState = new MockMemento();

	public readonly extensionUri = vscode.Uri.file('/fake/path');
	public get extensionPath() {
		return this.extensionUri.fsPath;
	}

	public readonly environmentVariableCollection = new MockEnvironmentVariableCollection();

	public asAbsolutePath(relativePath: string) {
		return vscode.Uri.joinPath(this.extensionUri, relativePath).fsPath;
	}

	public readonly storagePath = undefined;
	public readonly globalStoragePath = '/fake/path';
	public readonly logPath = '/fake/path';
}

class MockMemento implements vscode.Memento {
	public get<T>(_key: string, _defaultValue?: T) {
		return undefined;
	}

	public update(_key: string, _value: any) {
		return Promise.resolve();
	}
}

class MockEnvironmentVariableCollection implements vscode.EnvironmentVariableCollection {
	public persistent = true;

	private map = new Map<string, vscode.EnvironmentVariableMutator>();

	public replace(variable: string, value: string): void {
		this.map.set(variable, {
			type: vscode.EnvironmentVariableMutatorType.Replace,
			value,
		});
	}

	public append(variable: string, value: string): void {
		this.map.set(variable, {
			type: vscode.EnvironmentVariableMutatorType.Append,
			value,
		});
	}

	public prepend(variable: string, value: string): void {
		this.map.set(variable, {
			type: vscode.EnvironmentVariableMutatorType.Prepend,
			value,
		});
	}

	public get(variable: string): vscode.EnvironmentVariableMutator | undefined {
		return this.map.get(variable);
	}

	public forEach(
		callback: (
			variable: string,
			mutator: vscode.EnvironmentVariableMutator,
			collection: vscode.EnvironmentVariableCollection,
		) => any,
		thisArg?: any,
	): void {
		for (const [variable, mutator] of this.map) {
			callback.apply(thisArg, [variable, mutator, this]);
		}
	}

	public delete(variable: string): void {
		this.map.delete(variable);
	}

	public clear(): void {
		this.map.clear();
	}
}
