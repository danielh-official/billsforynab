<script lang="ts">
	import {
		db,
		type CustomBudgetDetail,
		type CustomCategoryGroupWithCategories,
		type CustomScheduledTransactionDetail
	} from '$lib/db';
	import { SvelteSet } from 'svelte/reactivity';
	import { createBillInYNAB } from '$lib';
	import type {
		Account,
		PostScheduledTransactionWrapper,
		ScheduledTransactionFrequency
	} from 'ynab/dist/models';

	let {
		budget,
		bill,
		isDemo,
		billsBeingSynced = $bindable(),
		availableAccounts,
		categoryGroups
	}: {
		budget: CustomBudgetDetail | undefined;
		bill: CustomScheduledTransactionDetail;
		isDemo: boolean;
		billsBeingSynced: SvelteSet<string>;
		availableAccounts: Account[];
		categoryGroups: CustomCategoryGroupWithCategories[];
	} = $props();

	function setBillSyncing(billId: string, syncing: boolean) {
		if (syncing) {
			billsBeingSynced.add(billId);
		} else {
			billsBeingSynced.delete(billId);
		}
	}

	function getAccountName(accountId: string | undefined | null) {
		if (!accountId) return undefined;
		return availableAccounts.find((a: Account) => a.id === accountId)?.name;
	}

	function getFrequencyMultiplier(frequency: ScheduledTransactionFrequency) {
		switch (frequency) {
			case 'never':
				return 0;
			case 'daily':
				return 30; // Approximate
			case 'weekly':
				return 4; // Approximate
			case 'everyOtherWeek':
				return 2; // Approximate
			case 'twiceAMonth':
				return 2;
			case 'monthly':
				return 1;
			case 'everyOtherMonth':
				return 0.5;
			case 'every3Months':
				return 1 / 3;
			case 'every4Months':
				return 0.25;
			case 'twiceAYear':
				return 2 / 12;
			case 'yearly':
				return 1 / 12;
			case 'everyOtherYear':
				return 0.5 / 12;
			default:
				return 0;
		}
	}

	function computeMonthlyAmount(
		amountMilliunits: number,
		frequency: ScheduledTransactionFrequency
	) {
		return amountMilliunits * getFrequencyMultiplier(frequency);
	}

	// MARK: - Find category by id
	function getCategoryName(categoryId: string | undefined | null) {
		const budgetId = budget?.id;

		if (!budgetId) return undefined;

		if (!categoryId || !budgetId) return undefined;
		for (const group of categoryGroups.filter((g) => g.budget_id === budgetId)) {
			const category = group.categories.find((c) => c.id === categoryId);
			if (category) {
				return category.name;
			}
		}
		return undefined;
	}

	async function publishDraftBill(bill: CustomScheduledTransactionDetail) {
		const budgetId = budget?.id;

		if (!budgetId) {
			alert('Budget ID is missing.');
			return;
		}
		if (!bill) return;
		if (!confirm('Publish this draft to YNAB?')) return;
		setBillSyncing(bill.id, true);

		const accountName = getAccountName(bill.account_id);

		if (!accountName) {
			alert('Account for the bill not found.');
			setBillSyncing(bill.id, false);
			return;
		}

		const payload: PostScheduledTransactionWrapper['scheduled_transaction'] = {
			payee_name: bill.payee_name || null,
			account_id: bill.account_id,
			amount: bill.amount,
			memo: bill.memo || null,
			frequency: bill.frequency,
			date: bill.date_next
		};

		const result = await createBillInYNAB(budgetId, payload, isDemo);
		if (!result.success || !result.id) {
			alert(result.error ?? 'Failed to publish draft bill.');
			setBillSyncing(bill.id, false);
			return;
		}

		const newId = result.id;
		const publishedBill: CustomScheduledTransactionDetail = {
			id: newId,
			published: true,
			account_name: accountName,
			monthly_amount: computeMonthlyAmount(bill.amount, bill.frequency),
			date_next: bill.date_next ?? bill.date_first,
			date_first: bill.date_first,
			budget_id: budgetId,
			frequency: bill.frequency,
			account_id: bill.account_id,
			amount: bill.amount,
			memo: bill.memo,
			payee_name: bill.payee_name,
			deleted: false,
			subtransactions: [],
			category_id: bill.category_id || null,
			category_name: getCategoryName(bill.category_id || null) || null
		};

		await db.scheduled_transactions.delete(bill.id);
		await db.scheduled_transactions.put(publishedBill);
		setBillSyncing(bill.id, false);
	}
</script>

<button
	class="rounded border border-amber-400 bg-amber-50 p-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
	disabled={billsBeingSynced.has(bill.id)}
	onclick={() => publishDraftBill(bill)}
	data-tooltip="Publish draft to YNAB"
	aria-label="Publish draft"
>
	🚀
</button>
