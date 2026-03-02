<script lang="ts">
	import {
		ScheduledTransactionFrequency,
		type ScheduledTransactionDetail,
		type ScheduledTransactionsResponse,
		type CategoriesResponse
	} from 'ynab/dist/models';
	import { db } from '$lib/db';
	import type {
		CustomBudgetDetail,
		CustomCategoryGroupWithCategories,
		CustomScheduledTransactionDetail
	} from '$lib/db';
	import { createFakeDataForDemo } from '$lib';

	let {
		currentBudget,
		isDemo
	}: {
		currentBudget: CustomBudgetDetail | undefined;
		isDemo: boolean;
	} = $props();

	// MARK: - Fetching scheduled transactions for budget

	let fetchingData = $state(false);

	// MARK: - Fetch data for budget

	async function fetchData() {
		fetchingData = true;

		let budgetId = currentBudget?.id;

		if (!budgetId) {
			alert('Budget is missing.');
			fetchingData = false;
			return;
		}

		// MARK: - Demo budget handling

		if (isDemo) {
			// For the demo budget, we will create realistic fake data instead of fetching from the API. This allows users to see how the app works without needing to connect their YNAB account or have any existing data in their account.
			await createFakeDataForDemo();

			fetchingData = false;

			return;
		}

		// MARK: - Fetch scheduled transactions

		let endpoint = `https://api.ynab.com/v1/budgets/${budgetId}/scheduled_transactions`;

		// Get last knowledge of server
		const lastKnowledgeOfServerOfScheduledTransactionsForBudget =
			currentBudget?.server_knowledge?.scheduled_transactions;

		if (lastKnowledgeOfServerOfScheduledTransactionsForBudget) {
			endpoint += `?last_knowledge_of_server=${lastKnowledgeOfServerOfScheduledTransactionsForBudget}`;
		}

		const scheduledTransactionsFetch = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${sessionStorage.getItem('ynab_access_token')}`
			}
		});

		if (!scheduledTransactionsFetch.ok) {
			console.error('Failed to fetch data:', scheduledTransactionsFetch.statusText);

			if (scheduledTransactionsFetch.status === 401) {
				alert('Unauthorized. Please login again.');
			} else {
				alert(`Failed to fetch data: ${scheduledTransactionsFetch.statusText}`);
			}

			fetchingData = false;
			return;
		}

		const scheduledTransactionsResponseJson: ScheduledTransactionsResponse =
			await scheduledTransactionsFetch.json();

		const scheduledTransactions: CustomScheduledTransactionDetail[] =
			scheduledTransactionsResponseJson.data.scheduled_transactions.map(
				(scheduledTransaction: ScheduledTransactionDetail) => ({
					...scheduledTransaction,
					budget_id: budgetId,
					published: true,
					monthly_amount:
						scheduledTransaction.amount *
						getFrequencyMultiplier(scheduledTransaction.frequency as ScheduledTransactionFrequency)
				})
			);

		const newScheduledTransactionsServerKnowledge =
			scheduledTransactionsResponseJson.data.server_knowledge;

		const existingCategoriesServerKnowledge = currentBudget?.server_knowledge?.category_groups || 0;

		// MARK: - Update budget
		// Do this even though we don't have server knowledge for category groups yet,
		// because if category groups fetch fails, we at least have server knowledge for scheduled transactions
		await db.budgets.update(budgetId, {
			server_knowledge: {
				scheduled_transactions: newScheduledTransactionsServerKnowledge,
				category_groups: existingCategoriesServerKnowledge
			},
			last_fetched: new Date()
		});

		// Bulk put scheduled transactions
		await db.scheduled_transactions.bulkPut(scheduledTransactions);

		// MARK: - Now fetch category groups with categories nested in each

		endpoint = `https://api.ynab.com/v1/budgets/${budgetId}/categories`;

		// Get last knowledge of server
		const lastKnowledgeOfServerOfCategoryGroupsForBudget =
			currentBudget?.server_knowledge?.category_groups || 0;

		if (lastKnowledgeOfServerOfCategoryGroupsForBudget) {
			endpoint += `?last_knowledge_of_server=${lastKnowledgeOfServerOfCategoryGroupsForBudget}`;
		}

		const categoriesFetch = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${sessionStorage.getItem('ynab_access_token')}`
			}
		});

		if (!categoriesFetch.ok) {
			console.error('Failed to fetch categories:', categoriesFetch.statusText);

			if (categoriesFetch.status === 401) {
				alert('Unauthorized. Please login again.');
			} else {
				alert(`Failed to fetch categories: ${categoriesFetch.statusText}`);
			}
			fetchingData = false;
			return;
		}

		const categoriesResponseJson: CategoriesResponse = await categoriesFetch.json();

		const newCategoryGroupsServerKnowledge = categoriesResponseJson.data.server_knowledge;

		// MARK: - Update budget Again
		await db.budgets.update(budgetId, {
			server_knowledge: {
				scheduled_transactions: newScheduledTransactionsServerKnowledge,
				category_groups: newCategoryGroupsServerKnowledge
			},
			last_fetched: new Date()
		});

		const categoryGroupWithCategories: CustomCategoryGroupWithCategories[] =
			categoriesResponseJson.data.category_groups.map((group) => ({
				...group,
				budget_id: budgetId
			}));

		// Bulk put category groups with categories
		await db.category_groups.bulkPut(categoryGroupWithCategories);

		fetchingData = false;
	}

	// MARK: - Get frequency multiplier for monthly equivalent calculation

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
</script>

<button
	class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700/50"
	disabled={fetchingData}
	onclick={fetchData}
	data-tooltip="Fetch the latest repeating scheduled transactions data from YNAB"
>
	{fetchingData ? 'Fetching…' : 'Fetch Data'}
</button>
