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
	{bill.excluded ? '👁️' : '✓'}
</button>
