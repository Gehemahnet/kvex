import { onScopeDispose, ref, toRaw, watch, type Ref } from "vue";

const KVEX_CLIENT_DB_NAME = "kvex-client";
const KVEX_CLIENT_DB_VERSION = 1;
const KVEX_CLIENT_STORE_NAME = "kvex-state";

type IndexedDbStateOptions = {
	deep?: boolean;
};

const openClientDb = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.open(KVEX_CLIENT_DB_NAME, KVEX_CLIENT_DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(KVEX_CLIENT_STORE_NAME);
		};
	});

const readValue = async <T>(key: string): Promise<T | undefined> => {
	const db = await openClientDb();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(KVEX_CLIENT_STORE_NAME, "readonly");
		const store = transaction.objectStore(KVEX_CLIENT_STORE_NAME);
		const request = store.get(key);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result as T | undefined);
		transaction.oncomplete = () => db.close();
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	});
};

const writeValue = async <T>(key: string, value: T): Promise<void> => {
	const db = await openClientDb();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(KVEX_CLIENT_STORE_NAME, "readwrite");
		const store = transaction.objectStore(KVEX_CLIENT_STORE_NAME);

		store.put(toRaw(value), key);
		transaction.oncomplete = () => {
			db.close();
			resolve();
		};
		transaction.onerror = () => {
			db.close();
			reject(transaction.error);
		};
	});
};

/** Persists a Vue ref in IndexedDB without validating or reshaping the value. */
export const useIndexedDbState = <T>(
	key: string,
	defaultValue: T,
	options: IndexedDbStateOptions = {},
): Ref<T> => {
	const state = ref(defaultValue) as Ref<T>;
	let isDisposed = false;
	let isHydrating = true;

	readValue<T>(key)
		.then((savedValue) => {
			if (!isDisposed && savedValue !== undefined) {
				state.value = savedValue;
			}
		})
		.catch(() => {
			// IndexedDB persistence is optional for UI preferences.
		})
		.finally(() => {
			isHydrating = false;
		});

	const stopWatch = watch(
		state,
		(value) => {
			if (!isHydrating) {
				void writeValue(key, value).catch(() => {
					// IndexedDB persistence is optional for UI preferences.
				});
			}
		},
		{ deep: options.deep ?? true },
	);

	onScopeDispose(() => {
		isDisposed = true;
		stopWatch();
	});

	return state;
};
