# Optimox — Lightweight & Elegant Data Query Cache Library For Sveltekit 🌟

`Optimox` is a **minimal**, **performant**, and **easy-to-use** library for reactive data fetching in Svelte‑5 applications. Designed with precision and simplicity.

- ✅ Fast, automatic caching and revalidation
- ✅ Reactive state for query & mutation
- ✅ No boilerplate, No ceremonies — just **clean**, **concise** API
- ✅ Fully compatible with Svelte 5 runes (`$state`, `$derived`)

---

## 📦 Installation

```
npm install optimox
```

then in your components, you can use the following:

```ts
import { QueryCache, mutation, query } from 'optimox';
```

---

## 🚀 Key Features

### 🔧 `QueryCache.config(opts)`

Set global configuration options for:

- `ttl` (cache time in minutes)
- `refresh` (background revalidation every `n` minutes)
- `enabled` (default query behavior)

---

### 🧠 `QueryCache.query(key, fn, options)`

Reactive query builder that returns:

- `data` — fetched result
- `pending` — initial fetch state
- `refetching` — background revalidate in progress
- `error` — fetch error
- `refetch()` — manual refresh method

⚡ Features:

- Customizable cache-timing (`ttl`)
- Lazy revalidation (`refresh`)
- Debouncing during active fetches
- Data preserved across refetches

---

### 🔁 `QueryCache.mutation(fn, options)`

Handles mutations with:

- `result`, `pending`, `error` — reactive state
- `submit(vars)` — execute mutation
- Optional callbacks:

  - `onMutation` (before start) - could be used for optmistic updates
  - `onSucceed` (on success)
  - `onFailure` (on error) - Notify or rollback UI updates

Example:

```ts
import { mutation } from 'optimox';
const PostMutation = mutation((title: string) => axios.post('/posts', { title }), {
	onMutation: (v) => console.log('Running...', v),
	onSucceed: (r) => console.log('Success', r),
	onFailure: (e) => console.log('Error', e)
});

// later, use .submit() to execute the mutation
PostMutation.submit({ title: 'Some random post title' });
```

---

### 🧹 `QueryCache.refresh(key)`

Re-fire an existing query in background (preserves caching).

---

### 🧼 `QueryCache.clear(key, { bulk?: boolean })`

Remove a cached query:

- Exact key or prefix (`bulk = true`)
- Automatically cancels pending TTL timers

Example:

```ts
QueryCache.clear(['posts', 42]); // Remove single query
QueryCache.clear(['posts'], { bulk: true }); // Remove all queries that start with "posts"
```

---

## 🎯 How It Works

1. **Cache Map**: each query stored by stringified key
2. **TTL Timer**: auto-deletes stale entries after `ttl`
3. **`refresh` Timer**: triggers lazy revalidation
4. **Debouncing Guard**: prevents duplicate fetch calls
5. **Reactive state** with Svelte `$state` and `untrack`

---

## 📋 Usage

**Setup Global Config: (Optional)**

```ts
QueryCache.config({ ttl: 5, refresh: 2 }); // It's entirely optional to use this in your +layout.svelte if you're ok with default settings
```

**Typical Query**

```ts
import { query } from 'optimox';
import UserAPI from '@/apis/UserAPI'

// Note: Destructuring attributes like {data , pending , error , refetching} = query(['somekey'],fn) will not be reactive unless you wrap the query inside `$derived` rune
const Query = query(['users'],UserAPI.list, { ttl: 5, refresh: 2 }); // enabled option is true by default, even if not explicitly specified

{#if Query.pending || Query.refetching}
<span>Loading...</span>
{/if}

{#if Query.data} // Suppose data is a list of users
	<ul>
		{#each Query.data as user }
			<li>{user.firstName}</li>
		{/each}
	</ul>
{/if}

```

**Reactive Query: (For Search or Pagiantion)**

```ts
// Wrap your query inside `$derived` rune to trigger query execution whenever the `id` changes
// Note: Destructuring properties only works when wrapping the query or mutation inside a `$derived`, otherwise extracted properties will not be reactive
let { data, pending, error, refetch } = $derived(
	query(['user', id], () => fetchUser(id), { enabled: !!id })
);

{#if pending}
	<span>Loading...</span>
{/if}
{#if error}
	<p> {error.message}</p>
{:else}
	<h1>{data?.something}</h1>
{/if}


```

**Mutation:**

```ts
let PostMutation = mutation((post) => axios.post('/save', post), {
	onSucceed: () => QueryCache.refresh(['posts', id])
});
```

---

## 🎁 Advantages

- **No external dependencies**
- **Zero boilerplate**
- **Built for Svelte runes** — no `svelte/store` needed

---

## 📚 API Summary

| Function                  | Signature                                                             | Description                         |
| ------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `QueryCache.config(opts)` | `(cfg: { ttl?: number, refresh?: number, enabled?: boolean })`        | Global settings                     |
| `query`                   | `(key: any[], fn: Fn<T>, opts?: QueryOptions) => StateWithRefetch<T>` | Reactive fetch/timer                |
| `mutation`                | `(fn: FnWithArgs<V, T>, opts?: MutationOptions<T>) => MutateState<T>` | Reactive mutation                   |
| `QueryCache.refresh`      | `(key: any[])`                                                        | Manually trigger background refetch |
| `QueryCache.clear`        | `(key: any[], flag?: { all?: boolean })`                              | Remove cache entry(s)               |

---

## ✅ When to Use This Package

- Building Svelte-5 apps with minimal data-fetch needs
- Avoiding bloated libs like TanStack Query
- Favoring simplicity, performance, and maintainable code

---

## ✨ Contribute & Feedback

Enhancements are welcome—feature requests, PRs for better debug tooling very much appreciated!
