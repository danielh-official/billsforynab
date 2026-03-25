<script lang="ts">
	import { db, type CustomScheduledTransactionDetail } from '$lib/db';

	let {
		bill
	}: {
		bill: CustomScheduledTransactionDetail;
	} = $props();

	async function toggleExcluded(billId: string, currentExcluded: boolean) {
		await db.scheduled_transactions.update(billId, {
			excluded: !currentExcluded
		});
	}
</script>

<button
	class="rounded border border-stone-300 bg-white p-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
	onclick={() => toggleExcluded(bill.id, bill.excluded ?? false)}
	data-tooltip={bill.excluded ? 'Excluded from calculations' : 'Included in calculations'}
	aria-label={bill.excluded ? 'Include bill' : 'Exclude bill'}
>
	{#if bill.excluded}
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
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
			<circle cx="12" cy="12" r="3"></circle>
		</svg>
	{:else}
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
			<polyline points="20 6 9 17 4 12"></polyline>
		</svg>
	{/if}
</button>
