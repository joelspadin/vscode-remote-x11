import * as assert from 'assert';
import { afterEach } from 'mocha';
import sinon = require('sinon');

import { getDisplay } from '../../config';
import { stubConfig } from '../stubs';

suite('Configuration Test Suite', () => {
	afterEach(() => {
		sinon.restore();
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
});
