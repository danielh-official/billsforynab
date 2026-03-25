<script lang="ts">
	import { db } from '$lib/db';
	import type { CustomScheduledTransactionDetail } from '$lib/db';
	import { SvelteSet } from 'svelte/reactivity';
	import { deleteBillInYNAB, unsupportedFrequencies } from '$lib';

	let {
		bill,
		isDemo,
		billsBeingSynced = $bindable(),
		budgetId
	}: {
		bill: CustomScheduledTransactionDetail;
		isDemo: boolean;
		billsBeingSynced: SvelteSet<string>;
		budgetId: string;
	} = $props();

	// MARK: - Local helpers for syncing and toasts

	function setBillSyncing(billId: string, syncing: boolean) {
		if (syncing) {
			billsBeingSynced.add(billId);
		} else {
			billsBeingSynced.delete(billId);
		}
	}

	// MARK: - Delete bill handler

	async function handleDeleteBill(bill: CustomScheduledTransactionDetail) {
		if (!budgetId) {
			alert('Budget ID is missing.');
			return;
		}

		if (!bill) return;
		if (!bill.published) {
			await db.scheduled_transactions.delete(bill.id);
			alert('Draft deleted.');
			return;
		}

		if (!confirm('Delete this bill in YNAB?')) return;
		setBillSyncing(bill.id, true);
		const result = await deleteBillInYNAB(budgetId, bill.id, isDemo);
		if (!result.success) {
			alert(result.error ?? 'Failed to delete bill.');
			setBillSyncing(bill.id, false);
			return;
		}

		await db.scheduled_transactions.delete(bill.id);
		setBillSyncing(bill.id, false);
	}
</script>

<button
	class="rounded border border-stone-300 bg-white p-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
	disabled={billsBeingSynced.has(bill.id) || unsupportedFrequencies.includes(bill.frequency)}
	onclick={() => handleDeleteBill(bill)}
	data-tooltip={unsupportedFrequencies.includes(bill.frequency)
		? `Cannot delete (API: ${unsupportedFrequencies.join(', ')})`
		: 'Delete this bill'}
	aria-label="Delete bill"
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
		<polyline points="3 6 5 6 21 6"></polyline>
		<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
		<path d="M10 11v6"></path>
		<path d="M14 11v6"></path>
		<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
	</svg>
</button>
