import * as assert from 'assert';
import { afterEach } from 'mocha';
import sinon = require('sinon');

import { getDisplay, getExtraVariables, getConfig } from '../../config';
import { stubConfig } from '../stubs';

suite('Configuration Test Suite', () => {
	afterEach(() => {
		sinon.restore();
	});

	test('getConfig: container.enable = true', () => {
		stubConfig({
			'container.enable': true,
		});

		assert.strictEqual(getConfig('container.enable', true), true);
	});

	test('getConfig: container.enable = false', () => {
		stubConfig({
			'container.enable': false,
		});

		assert.strictEqual(getConfig('container.enable', true), false);
	});

	test('getConfig: container.enable = default', () => {
		stubConfig({});

		assert.strictEqual(getConfig('container.enable', true), true);
	});

	test('getDisplay', () => {
		stubConfig({
			display: 1,
			screen: 2,
		});

		assert.strictEqual(getDisplay('localhost'), 'localhost:1.2');
	});

	test('getDisplay: default display', () => {
		stubConfig({ screen: 1 });
		assert.strictEqual(getDisplay('localhost'), 'localhost:0.1');
	});

	test('getDisplay: default screen', () => {
		stubConfig({ display: 1 });
		assert.strictEqual(getDisplay('localhost'), 'localhost:1.0');
	});

	test('getExtraVariables', () => {
		stubConfig({ extraVariables: ['FOO=BAR', 'BAZ=1'] });
		assert.deepStrictEqual(
			getExtraVariables(),
			new Map([
				['FOO', 'BAR'],
				['BAZ', '1'],
			]),
		);
	});

	test('getExtraVariables: empty', () => {
		stubConfig({ extraVariables: [] });
		assert.deepStrictEqual(getExtraVariables(), new Map());
	});

	test('getExtraVariables: default', () => {
		stubConfig({});
		assert.deepStrictEqual(getExtraVariables(), new Map([['LIBGL_ALWAYS_INDIRECT', '1']]));
	});

	test('getExtraVariables: missing =', () => {
		stubConfig({
			extraVariables: ['FOO'],
		});
		assert.throws(getExtraVariables);
	});

	test('getExtraVariables: missing name', () => {
		stubConfig({
			extraVariables: ['=1'],
		});
		assert.throws(getExtraVariables);
	});

	test('getExtraVariables: missing value', () => {
		stubConfig({
			extraVariables: ['FOO='],
		});
		assert.throws(getExtraVariables);
	});
});
