export interface CallbackManager<T> {
	add: (cb: (value: T) => void) => () => void;
	emit: (value: T) => void;
	clear: () => void;
}

export const createCallbackManager = <T>(): CallbackManager<T> => {
	const callbacks = new Set<(value: T) => void>();

	return {
		add: (cb) => {
			callbacks.add(cb);
			return () => callbacks.delete(cb);
		},
		emit: (value) => {
			for (const cb of callbacks) {
				cb(value);
			}
		},
		clear: () => callbacks.clear(),
	};
};
