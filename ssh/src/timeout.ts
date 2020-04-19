export class TimeoutError extends Error {}

/**
 * Resolves to the value of the given promise if it completes within a set
 * duration, or rejects otherwise.
 * @param promise Promise to apply a timeout to.
 * @param ms Number of milliseconds to wait before timing out. Use 0 to wait forever.
 * @param errorMessage Error message to use if timed out.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage?: string): Promise<T> {
	if (ms === 0) {
		return promise;
	}

	let id: NodeJS.Timeout | undefined;
	const timer = new Promise<never>((_resolve, reject) => {
		id = setTimeout(() => reject(new TimeoutError(errorMessage)), ms);
	});

	const result = Promise.race([promise, timer]);

	if (id !== undefined) {
		clearTimeout(id);
	}

	return result;
}
