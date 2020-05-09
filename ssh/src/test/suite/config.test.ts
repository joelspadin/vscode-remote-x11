import * as assert from 'assert';
import * as os from 'os';

import {
	getDisplay,
	getScreen,
	getAuthenticationMethod,
	getAgent,
	getPrivateKey,
	getServerHost,
	getServerPort,
	getDisplayCommand,
	DefaultDisplayCommand,
	DefaultTimeout,
	getTimeout,
	isVerboseLoggingEnabled,
} from '../../config';
import { stubConfig } from '../stubs';

suite('Configuration Test Suite', () => {
	test('getDisplay', () => {
		stubConfig({ display: 1 });
		assert.strictEqual(getDisplay(), 1);
	});

	test('getDisplay: default', () => {
		stubConfig({});
		assert.strictEqual(getDisplay(), 0);
	});

	test('getScreen', () => {
		stubConfig({ screen: 1 });
		assert.strictEqual(getScreen(), 1);
	});

	test('getScreen: default', () => {
		stubConfig({});
		assert.strictEqual(getScreen(), 0);
	});

	test('getAuthenticationMethod', () => {
		stubConfig({
			'SSH.authenticationMethod': 'agent',
		});
		assert.strictEqual(getAuthenticationMethod(), 'agent');
	});

	test('getAgent', () => {
		stubConfig({
			'SSH.agent': 'fakeagent',
		});
		assert.strictEqual(getAgent(), 'fakeagent');
	});

	test('getAgent: default', () => {
		stubConfig({});

		let expected: string;

		if (os.platform() === 'win32') {
			expected = '\\\\.\\pipe\\openssh-ssh-agent';
		} else {
			expected = 'fakesocket';
			process.env['SSH_AUTH_SOCK'] = expected;
		}

		assert.strictEqual(getAgent(), expected);
	});

	test('getPrivateKey', () => {
		stubConfig({
			'SSH.privateKey': '~/.ssh/id_ecdsa',
		});
		assert.strictEqual(getPrivateKey(), '~/.ssh/id_ecdsa');
	});

	test('getServerHost', () => {
		stubConfig({
			'SSH.host': 'localhost',
		});
		assert.strictEqual(getServerHost(), 'localhost');
	});

	test('getServerHost: default', () => {
		stubConfig({});
		assert.strictEqual(getServerHost(), null);
	});

	test('getServerPort', () => {
		stubConfig({
			'SSH.port': 42,
		});
		assert.strictEqual(getServerPort(), 42);
	});

	test('getServerPort: default', () => {
		stubConfig({});
		assert.strictEqual(getServerPort(), null);
	});

	test('getDisplayCommand', () => {
		stubConfig({
			'SSH.displayCommand': 'fakecommand',
		});
		assert.strict(getDisplayCommand(), 'fakecommand');
	});

	test('getDisplayCommand: default', () => {
		stubConfig({});
		assert.strict(getDisplayCommand(), DefaultDisplayCommand);
	});

	test('getTimeout', () => {
		stubConfig({
			'SSH.timeout': 42,
		});
		assert.strictEqual(getTimeout(), 42);
	});

	test('getTimeout: default', () => {
		stubConfig({});
		assert.strictEqual(getTimeout(), DefaultTimeout);
	});

	test('isVerboseLoggingEnabled', () => {
		stubConfig({
			'SSH.verboseLogging': true,
		});
		assert.strictEqual(isVerboseLoggingEnabled(), true);
	});

	test('isVerboseLoggingEnabled: default', () => {
		stubConfig({});
		assert.strictEqual(isVerboseLoggingEnabled(), false);
	});
});
