import * as assert from 'assert';
import { afterEach, beforeEach } from 'mocha';
import * as os from 'os';
import * as process from 'process';
import sinon = require('sinon');
import * as vscode from 'vscode';

import { activate } from '../../extension';
import { stubRemoteName, stubConfig } from '../stubs';

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
