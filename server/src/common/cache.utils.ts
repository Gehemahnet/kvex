type CacheEntry<Value> = {
	expiresAt: number;
	value: Value;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const getCachedValue = async <Value>(
	key: string,
	ttlMs: number,
	fetcher: () => Promise<Value>,
): Promise<Value> => {
	const cachedValue = memoryCache.get(key) as CacheEntry<Value> | undefined;

	if (cachedValue && cachedValue.expiresAt > Date.now()) {
		return cachedValue.value;
	}

	const value = await fetcher();

	memoryCache.set(key, {
		expiresAt: Date.now() + ttlMs,
		value,
	});

	return value;
};

export const clearMemoryCache = (): void => {
	memoryCache.clear();
};

