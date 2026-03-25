<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CustomScheduledTransactionDetail } from '$lib/db';
	import type { SvelteSet } from 'svelte/reactivity';

	let {
		bill,
		billsBeingSynced = $bindable(),
		budgetId
	}: {
		bill: CustomScheduledTransactionDetail;
		billsBeingSynced: SvelteSet<string>;
		budgetId: string;
	} = $props();
</script>

<a
	href={resolve(`/plan/${budgetId}/bill/${bill.id}`)}
	class="rounded border border-stone-300 bg-white p-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 {billsBeingSynced.has(
		bill.id
	)
		? 'pointer-events-none opacity-50'
		: ''}"
	data-tooltip="Edit this bill"
	aria-label="Edit bill"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
		<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
	</svg>
</a>
