import { untrack } from 'svelte';

const configs: QueryOptions = { ttl: 10, refresh: 5, enabled: true };

const store = new Map<
	string,
	{
		state: {
			/**
			 * The query response data
			 */
			data: any;
			/**
			 * Indicates if the query is being executed for (Query or Mutation)
			 */
			pending: boolean;
			/**
			 * Indicates that the query is being refetched in the background
			 */
			refetching: boolean;
			/**
			 * The query error object
			 */
			error: Error | null;
			/**
			 * Refetch function used for refetching or also fetching for the first time if the query was marked as {enabled:false}
			 */
			refetch?: () => Promise<any>;
		};
		// Fetcher function passed to the query
		fn: Fn<any>;
		// Options passed to the query for specific configurations
		opts: QueryOptions;
		timeout: number;
		// Datetime Snapshot for the last execution of the query
		timestamp: number;
	}
>();

export function query<T>(key: any[], fn: Fn<T>, opts: QueryOptions = {}) {
	if (key.length === 0) throw new Error('Query key list must not be empty');
	// Prevent query ending with `undefined` , `null` or `NaN` , `''` from being called or cached except for number 0
	if (!key.at(-1) && key.at(-1) !== 0) return { data: null } as typeof state;

	const id = JSON.stringify(key);
	const cached = store.get(id);
	if (cached?.state.pending || cached?.state.refetching) return cached.state; // debouncing guard for rapid successive calls to same query

	if (cached?.opts.enabled) {
		// Check if the query is stale, if yes, trigger it to make a cache refresh
		const refresh = (cached.opts.refresh ?? configs.refresh!) * 60_000;
		if (refresh > 0 && Date.now() - cached.timestamp > refresh) {
			execute(id);
			clearTimeout(cached.timeout);
			// if TTL passed via options or the global configs is limitless, Never schedule a timeout to clear the cache
			if (opts.ttl != Infinity || configs.ttl != Infinity)
				cached.timeout = setTimeout(() => store.delete(id), (opts.ttl ?? configs.ttl!) * 60_000);
		}
		// return the cached state if the query still fresh
		return cached.state;
	}

	const state = $state({
		data: null as T | null,
		pending: false,
		refetching: false,
		error: null,
		refetch: () => execute(id)
	});

	store.set(id, {
		state,
		fn,
		opts,
		timestamp: Date.now(),
		timeout: setTimeout(() => store.delete(id), (opts.ttl ?? configs.ttl!) * 60_000)
	});

	if (opts.enabled ?? configs.enabled) execute(id);
	return state;
}

export function mutation<T, V>(fn: (vars: V) => Promise<T>, opts: MutationOptions<T> = {}) {
	const state = $state({
		result: null as T | null,
		pending: false,
		error: null as Error | null,
		async submit(vars?: V): Promise<T | undefined> {
			if (state.pending) return undefined;

			state.pending = true;
			state.error = null;

			try {
				opts.onMutation?.(vars);
				const result = await fn(vars as V);
				state.result = result;
				opts.onSucceed?.(result);
				return result;
			} catch (err) {
				const error = err instanceof Error ? err : Error(String(err));
				state.error = error;
				opts.onFailure?.(error);
				if (import.meta.env.DEV) throw error;
			} finally {
				state.pending = false;
			}
		}
	});

	return state;
}

async function execute(key: string): Promise<void> {
	const cached = store.get(key);
	if (!cached) return;
	if (cached?.state.pending || cached?.state.refetching) return;

	untrack(() => {
		cached.state.pending = cached.state.data == null;
		cached.state.refetching = cached.state.data ? true : false;
		cached.state.error = null;
	});

	try {
		cached.state.data = await cached.fn();
		cached.timestamp = Date.now();
	} catch (err) {
		cached.state.error = err as Error;
	} finally {
		cached.state.pending = false;
		cached.state.refetching = false;
	}
}

export class QueryCache {
	/**
	 * Setting global query client configurations
	 */
	static config(opts: QueryOptions): void {
		Object.assign(configs, opts);
	}
	/**
	 * Triggers an existing query cache to be refetched in the background
	 */
	static refresh(key: any[]): void {
		execute(JSON.stringify(key));
	}

	/**
	 * Clear entire cache OR specific query cache by prefix key in the list
	 */
	static clear(key: any[] = [], flag?: { bulk: false }) {
		if (!key.length) {
			store.clear();
			return this;
		}

		const target = JSON.stringify(key);

		if (!flag?.bulk) {
			const cached = store.get(target);
			if (cached) clearTimeout(cached.timeout);
			store.delete(target);
		} else
			for (const [id, cached] of store)
				if (id.startsWith(`["${key[0]}"`)) clearTimeout(cached.timeout), store.delete(id);

		return this;
	}
}

type Fn<T> = () => Promise<T>;

type QueryOptions = {
	/**
	 * Determine if the query get executed on the fly or later on using refetch
	 * @default true
	 */
	enabled?: boolean;
	/**
	 * Lazy refresh the query cache every ('N') minutes in the background
	 * @default 5
	 */
	refresh?: number;
	/**
	 * TTL in minutes: for how long the query data will be kept in cache
	 * @default 10
	 */
	ttl?: number;
};

type MutationOptions<T, V = any> = {
	/**
	 * Perform an action before the request is sent, Can be used for optimistic updates
	 */
	onMutation?: (vars?: V) => void;
	/**
	 * Perform an action when the request succeeds
	 */
	onSucceed?: (data: T) => void;
	/**
	 * Perform an action when the request fails, Can be used for rolling back UI updates
	 */
	onFailure?: (err: Error) => void;
};
