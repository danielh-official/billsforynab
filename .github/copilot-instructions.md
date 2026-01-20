# GitHub Copilot Instructions for Bills (For YNAB)

## Project Overview

This is a SvelteKit web application for tracking recurring bills from YNAB (You Need A Budget). The app stores data locally in IndexedDB and uses the YNAB API to fetch financial data.

## Technology Stack

- **Framework**: SvelteKit (Svelte 5 with Runes mode)
- **Language**: TypeScript
- **Styling**: CSS (inline styles in components)
- **Testing**: Vitest + Playwright
- **Database**: Dexie (IndexedDB wrapper)
- **API**: YNAB REST API
- **Deployment**: Static adapter (GitHub Pages), Auto adapter, or Netlify adapter

## Svelte 5 & Runes Mode Requirements

**This project uses Svelte 5 with Runes mode enabled.** When generating Svelte code, you **MUST** follow these guidelines:

### Runes Mode Syntax

- Use `$state` for reactive state variables (not `let` with reactivity)
- Use `$derived` for computed values
- Use `$derived.by()` for computed values that require complex logic
- Use `$effect` for side effects (replaces `onMount`, `$:` assignments)
- Use `$bindable()` for two-way binding in props
- Component props use `let { prop } = $props()`

### Example Pattern

```svelte
<script lang="ts">
	let count = $state(0);
	let doubled = $derived(count * 2);
	let expensive = $derived.by(() => {
		// Complex computation
		return count * count;
	});

	function increment() {
		count++;
	}

	$effect(() => {
		console.log('Count changed to:', count);
	});
</script>

<button onclick={increment}>
	Count: {count} (Doubled: {doubled})
</button>
```

### Props & Component Communication

```svelte
<!-- Parent Component -->
<script lang="ts">
  import Child from './Child.svelte';
  let message = $state('Hello');
</script>

<Child bind:value={message} />

<!-- Child Component (Child.svelte) -->
<script lang="ts">
  let { value = $bindable() } = $props();
</script>

<input bind:value />
```

### Two-way Binding Pattern

Always use `$bindable()` for props that need two-way binding:

```svelte
<script lang="ts">
	let { visible = $bindable(), message, type } = $props();
</script>
```

## Code Style Guidelines

### TypeScript

- Use strict mode (`strict: true` in tsconfig.json)
- Always type function parameters and return values
- Use interfaces for data structures from external APIs
- Import types with `type` keyword: `import type { BudgetDetail } from 'ynab'`

### Component Structure

1. Script block with imports and types
2. Reactive state initialization
3. Derived values
4. Effects/side effects
5. Event handlers
6. Template HTML
7. Styles (optional, in `<style>` block)

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for components and types
- Use SCREAMING_SNAKE_CASE for constants
- Prefix internal stores with `_` (e.g., `_internalState`)

### File Organization

- Components in `src/lib/components/`
- Routes in `src/routes/`
- Utilities and types in `src/lib/`
- Database in `src/lib/db.ts`
- Styles in `src/lib/app.css`

## Key Project Patterns

### Database Interactions (Dexie)

```typescript
import { db } from '$lib/db';

// Reading
const budget = await db.budgets.get(id);

// Writing
await db.budgets.put(budget);

// Querying
const bills = await db.scheduled_transactions.where('budget_id').equals(budgetId).toArray();
```

### Live Queries with Dexie

```svelte
<script lang="ts">
	import { liveQuery } from 'dexie';

	let items = $state([]);

	$effect(() => {
		const subscription = liveQuery(() =>
			db.items.where('status').equals('active').toArray()
		).subscribe((result) => {
			items = result || [];
		});

		return () => subscription.unsubscribe();
	});
</script>
```

### YNAB API Calls

- Access token is stored in `sessionStorage.getItem('ynab_access_token')`
- API base URL: `https://api.ynab.com/v1/`
- All requests require `Authorization: Bearer {token}` header
- Handle 401 errors by clearing the token and redirecting to home

### Routing

- Use `from '$app/paths'` for path resolution: `resolve('/path')`
- Use `from '$app/navigation'` for navigation: `goto(resolve('/path'))`
- Use `from '$app/state'` for accessing page state

## Testing

### Unit Tests

- Located in `src/**/*.{test,spec}.ts`
- Use Vitest with Node environment for server code
- Run with `npm run test:unit`

### Component Tests

- Located in `src/**/*.svelte.{test,spec}.ts`
- Use Vitest with browser (Playwright) environment
- Use `vitest-browser-svelte` for rendering

### E2E Tests

- Located in `e2e/**/*.test.ts`
- Use Playwright
- Run with `npm run test:e2e`

### Example Component Test

```typescript
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MyComponent from './MyComponent.svelte';

describe('MyComponent', () => {
	it('should render', async () => {
		render(MyComponent);
		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
```

## Environment Variables

Public variables (accessible in browser):

- `PUBLIC_ADAPTER`: 'static' | 'auto' | 'netlify'
- `PUBLIC_BASE_PATH`: Base path for deployments (e.g., '/billsforynab')
- `PUBLIC_YNAB_CLIENT_ID`: OAuth client ID for YNAB

All public variables are prefixed with `PUBLIC_` and must be imported from `$env/static/public`.

## Common Patterns

### Modal/Toast Components

Toasts auto-dismiss after 4 seconds. Use the `Toast` component in `src/lib/components/Toast.svelte`:

```svelte
<script lang="ts">
	import Toast from '$lib/components/Toast.svelte';

	let toastVisible = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error' | 'info'>('info');

	function showError(message: string) {
		toastMessage = message;
		toastType = 'error';
		toastVisible = true;
	}
</script>

<Toast message={toastMessage} type={toastType} bind:visible={toastVisible} />
```

### Format Currency

```typescript
function determineAmountStringFromBudgetCurrency(amount: number) {
	const budgetCurrency = currentBudget?.currency_format?.iso_code || 'USD';
	const formatter = new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: budgetCurrency
	});
	return formatter.format(amount / 1000); // YNAB amounts are in milliunits
}
```

## Do's and Don'ts

### Do's ✅

- Use Svelte 5 runes mode exclusively
- Type all code thoroughly with TypeScript
- Store sensitive data in sessionStorage (not localStorage)
- Handle API errors gracefully with user-facing messages
- Test components with Vitest + Playwright
- Use `$derived` for computed values instead of reactive blocks
- Always unsubscribe from subscriptions in effect cleanup
- Use `$effect` for side effects instead of lifecycle hooks

### Don'ts ❌

- Don't use `onMount`, `onDestroy`, or `$:` reactive statements (use runes instead)
- Don't use `let` declarations for reactive state (use `$state`)
- Don't store access tokens in localStorage (use sessionStorage)
- Don't expose sensitive data in public environment variables
- Don't fetch YNAB data on every render (use live queries with Dexie)
- Don't assume IndexedDB is available on server (use `browser` check)
- Don't mix old Svelte 4 patterns with Svelte 5 runes

## Performance Considerations

- Use `liveQuery` from Dexie for real-time database subscriptions
- Debounce search/filter operations
- Use `$derived.by()` for expensive computations
- Lazy load routes where possible
- Minimize re-renders by using precise `$state` updates

## Accessibility

- Use semantic HTML (`<button>`, `<main>`, `<nav>`)
- Include `aria-label` on icon buttons
- Ensure color contrast meets WCAG standards
- Test with keyboard navigation
- Use proper heading hierarchy

## Additional Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
- [Dexie Documentation](https://dexie.org/)
- [YNAB API Documentation](https://developer.ynab.com/)
- Project guides: see `GUIDE.md` and `PRIVACY.md`
