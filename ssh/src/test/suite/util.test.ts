import * as assert from 'assert';

import { withTimeout, TimeoutError } from '../../timeout';

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

suite('Utilities Test Suite', () => {
	test('withTimeout: immediate resolve', async () => {
		const result = await withTimeout(Promise.resolve(42), 100);
		assert.equal(result, 42);
	});

	test('withTimeout: delayed resolve', async () => {
		const delayedResolve = async () => {
			await sleep(50);
			return 42;
		};

		const result = await withTimeout(delayedResolve(), 100);
		assert.equal(result, 42);
	});

	test('withTimeout: immediate reject', async () => {
		await assert.rejects(
			async () => {
				await withTimeout(Promise.reject(new Error('test')), 100);
			},
			Error,
			'test',
		);
	});

	test('withTimeout: delayed reject', async () => {
		const delayedReject = async () => {
			await sleep(50);
			throw Error('test');
		};

		await assert.rejects(
			async () => {
				await withTimeout(delayedReject(), 100);
			},
			Error,
			'test',
		);
	});

	test('withTimeout: timeout', async () => {
		await assert.rejects(
			async () => {
				await withTimeout(sleep(500), 100, 'test');
			},
			TimeoutError,
			'test',
		);
	});
});
