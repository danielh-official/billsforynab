<script lang="ts">
	import { db, type CustomBudgetDetail } from '$lib/db';

	let {
		currentBudget
	}: {
		currentBudget: CustomBudgetDetail | undefined;
	} = $props();

	// MARK: - Resetting data for budget

	let resettingData = $state(false);

	function resetDataForBudget() {
		const budgetId = currentBudget?.id;

		if (!budgetId) {
			alert('Budget ID is missing.');
			return;
		}

		if (
			!confirm(
				'Are you sure you want to reset the data for this plan? This action cannot be undone.'
			)
		) {
			return;
		}

		resettingData = true;

		db.transaction('rw', db.budgets, db.scheduled_transactions, db.category_groups, async () => {
			await db.scheduled_transactions.where('budget_id').equals(budgetId).delete();
			await db.category_groups.where('budget_id').equals(budgetId).delete();
			await db.budgets.update(budgetId, {
				server_knowledge: {
					scheduled_transactions: 0,
					category_groups: 0,
					transactions: 0
				},
				last_fetched: undefined
			});
		})
			.catch((error) => {
				console.error('Failed to reset data for budget:', error);
			})
			.finally(() => {
				resettingData = false;
			});
	}
</script>

<button
	class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700/50"
	type="button"
	disabled={resettingData}
	aria-busy={resettingData}
	onclick={resetDataForBudget}
	data-tooltip="Delete all locally stored scheduled transactions for this plan and reset server knowledge"
>
	{resettingData ? 'Resetting…' : 'Reset Data'}
</button>
