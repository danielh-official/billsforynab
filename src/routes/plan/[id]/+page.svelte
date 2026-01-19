<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { liveQuery } from 'dexie';
	import type { ScheduledTransactionFrequency, ScheduledTransactionDetail } from 'ynab';
	import { db } from '$lib/db';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { CustomBudgetDetail, CustomScheduledTransactionDetail } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';

	// MARK: - Mount and budgetId extraction

	let budgetId = $state<string | null>(null);

	const isDemo = $derived.by(() => {
		return page.params.id === 'demo';
	});

	onMount(async () => {
		const id = page.params.id;

		if (!id) {
			goto(resolve('/'));
			return;
		}

		const budgetIdExistsInDb = await db.budgets.get(id);

		if (!budgetIdExistsInDb) {
			goto(resolve('/'));
			return;
		}

		budgetId = id;
	});

	// MARK: - Fetching current budget from IndexedDB with live updates

	let currentBudget = $state<CustomBudgetDetail | null>(null);

	$effect(() => {
		if (!budgetId) return;

		const subscription = liveQuery(() =>
			db.budgets.where('id').equals(budgetId!).first()
		).subscribe((budget) => {
			currentBudget = budget ?? null;
		});

		return () => subscription.unsubscribe();
	});

	// MARK: - Fetching scheduled transactions for budget

	let fetchingScheduledTransactions = $state(false);

	async function getScheduledTransactionsForBudget() {
		fetchingScheduledTransactions = true;

		const budgetIdValue = budgetId;

		if (!budgetIdValue) {
			console.error('Budget ID is missing.');
			fetchingScheduledTransactions = false;
			return;
		}

		if (isDemo) {
			// For the demo budget, we will create realistic fake data instead of fetching from the API. This allows users to see how the app works without needing to connect their YNAB account or have any existing data in their account.

			const fakeBills: CustomScheduledTransactionDetail[] = [
				{
					id: 'demo-bill-1',
					budget_id: 'demo',
					payee_name: 'Electric Company',
					category_name: 'Utilities',
					amount: -75000, // $75.00
					frequency: 'monthly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 5)
					).toISOString(), // 5 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 6)
					).toISOString(), // 6 months ago
					memo: 'Monthly electric bill',
					monthly_amount: -75000,
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				{
					id: 'demo-bill-2',
					budget_id: 'demo',
					payee_name: 'Water Company',
					category_name: 'Utilities',
					amount: -30000, // $30.00
					frequency: 'monthly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 10)
					).toISOString(), // 10 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 3)
					).toISOString(), // 3 months ago
					memo: 'Monthly water bill',
					monthly_amount: -30000,
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				{
					id: 'demo-bill-3',
					budget_id: 'demo',
					payee_name: 'Spotify',
					category_name: 'Entertainment',
					amount: -9990, // $9.99
					frequency: 'monthly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 2)
					).toISOString(), // 2 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 12)
					).toISOString(), // 12 months ago
					memo: 'Monthly Spotify subscription',
					monthly_amount: -9990,
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				{
					id: 'demo-bill-4',
					budget_id: 'demo',
					payee_name: 'Netflix',
					category_name: 'Entertainment',
					amount: -15900, // $15.90
					frequency: 'monthly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 15)
					).toISOString(), // 15 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 8)
					).toISOString(), // 8 months ago
					memo: 'Monthly Netflix subscription',
					monthly_amount: -15900,
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				{
					id: 'demo-bill-5',
					budget_id: 'demo',
					payee_name: 'Gym Membership',
					category_name: 'Health & Fitness',
					amount: -45000, // $45.00
					frequency: 'monthly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 20)
					).toISOString(), // 20 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 4)
					).toISOString(), // 4 months ago
					memo: 'Monthly gym membership fee',
					monthly_amount: -45000,
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				{
					id: 'demo-bill-6',
					budget_id: 'demo',
					payee_name: 'Car Insurance',
					category_name: 'Auto & Transport',
					amount: -120000, // $120.00
					frequency: 'everyOtherMonth',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 25)
					).toISOString(), // 25 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 10)
					).toISOString(), // 10 months ago
					memo: 'Bi-monthly car insurance payment',
					monthly_amount: -60000, // Monthly equivalent for bi-monthly payment
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				{
					id: 'demo-bill-7',
					budget_id: 'demo',
					payee_name: 'Credit Card',
					category_name: 'Credit Card',
					amount: -200000, // $200.00
					frequency: 'monthly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 7)
					).toISOString(), // 7 days from now
					date_first: new SvelteDate(
						new SvelteDate().setMonth(new SvelteDate().getMonth() - 6)
					).toISOString(), // 6 months ago
					memo: 'Monthly credit card payment',
					monthly_amount: -200000,
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				},
				// yearly
				{
					id: 'demo-bill-8',
					budget_id: 'demo',
					payee_name: 'Car Registration',
					category_name: 'Auto & Transport',
					amount: -60000, // $60.00
					frequency: 'yearly',
					date_next: new SvelteDate(
						new SvelteDate().setDate(new SvelteDate().getDate() + 30)
					).toISOString(), // 30 days from now
					date_first: new SvelteDate(
						new SvelteDate().setFullYear(new SvelteDate().getFullYear() - 2)
					).toISOString(), // 2 years ago
					memo: 'Yearly car registration fee',
					monthly_amount: -5000, // Monthly equivalent for yearly payment
					account_id: 'demo-account-1',
					account_name: 'Checking Account',
					deleted: false,
					subtransactions: []
				}
			];

			await db.scheduled_transactions.bulkPut(fakeBills);

			fetchingScheduledTransactions = false;

			return;
		}

		let endpoint = `https://api.ynab.com/v1/budgets/${budgetIdValue}/scheduled_transactions?budget_id=${budgetIdValue}`;

		// Get last knowledge of server
		const lastKnowledgeOfServerForBudget = currentBudget?.scheduled_transactions_server_knowledge;

		if (lastKnowledgeOfServerForBudget) {
			endpoint += `&last_knowledge_of_server=${lastKnowledgeOfServerForBudget}`;
		}

		const response = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${sessionStorage.getItem('ynab_access_token')}`
			}
		});

		if (!response.ok) {
			console.error('Failed to fetch scheduled transactions:', response.statusText);
			fetchingScheduledTransactions = false;
			return;
		}

		const responseData = await response.json();

		const scheduledTransactions = responseData.data.scheduled_transactions.map(
			(transaction: ScheduledTransactionDetail) => ({
				...transaction,
				budget_id: budgetIdValue,
				monthly_amount:
					transaction.amount *
					getFrequencyMultiplier(transaction.frequency as ScheduledTransactionFrequency)
			})
		);

		const newServerKnowledge = responseData.data.server_knowledge;

		// Update the budget in IndexedDB with the new scheduled transactions and server knowledge
		await db.scheduled_transactions.bulkPut(scheduledTransactions);

		await db.budgets.update(budgetIdValue, {
			scheduled_transactions_server_knowledge: newServerKnowledge,
			scheduled_transactions_last_fetched: new Date()
		});

		fetchingScheduledTransactions = false;
	}

	// MARK: - Resetting data for budget

	let resettingData = $state(false);

	function resetDataForBudget() {
		const budgetIdValue = budgetId;

		if (!budgetIdValue) {
			console.error('Budget ID is missing.');
			return;
		}

		if (
			!confirm(
				'Are you sure you want to reset the scheduled transactions data for this budget? This action cannot be undone.'
			)
		) {
			return;
		}

		resettingData = true;

		db.transaction('rw', db.budgets, db.scheduled_transactions, async () => {
			await db.scheduled_transactions.where('budget_id').equals(budgetIdValue).delete();
			await db.budgets.update(budgetIdValue, {
				scheduled_transactions_server_knowledge: 0,
				scheduled_transactions_last_fetched: undefined
			});
		})
			.catch((error) => {
				console.error('Failed to reset data for budget:', error);
			})
			.finally(() => {
				resettingData = false;
			});
	}

	// MARK: - Sorting options with localStorage persistence

	let sortBy = $state('date_next');
	let sortDirection = $state('asc');

	onMount(() => {
		if (typeof localStorage === 'undefined') return;

		const storedSortBy = localStorage.getItem('sort_by');
		const storedSortDirection = localStorage.getItem('sort_direction');

		if (storedSortBy === 'date_next' || storedSortBy === 'monthly_amount') {
			sortBy = storedSortBy;
		}

		if (storedSortDirection === 'asc' || storedSortDirection === 'desc') {
			sortDirection = storedSortDirection;
		}
	});

	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem('sort_by', sortBy);
		localStorage.setItem('sort_direction', sortDirection);
	});

	// MARK: - Bills list with live updates from IndexedDB

	let rawBills = $state<CustomScheduledTransactionDetail[]>([]);

	$effect(() => {
		if (!budgetId) return;

		const subscription = liveQuery(async () => {
			return db.scheduled_transactions
				.where('budget_id')
				.equals(budgetId!)
				.and((transaction) => !transaction.deleted && transaction.amount < 0)
				.toArray();
		}).subscribe((transactions) => {
			rawBills = transactions || [];
		});

		return () => subscription.unsubscribe();
	});

	// Sort transactions reactively based on sortBy and sortDirection
	let bills = $derived.by(() => {
		const transactions = rawBills;
		if (!transactions) return [];

		if (sortBy === 'date_next') {
			return [...transactions].sort((a, b) => {
				const dateA = new Date(a.date_next).getTime();
				const dateB = new Date(b.date_next).getTime();
				return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
			});
		} else if (sortBy === 'monthly_amount') {
			return [...transactions].sort((a, b) => {
				if (a.monthly_amount === undefined || b.monthly_amount === undefined) {
					return 0; // If monthly_amount is missing, consider them equal for sorting
				}

				return sortDirection === 'desc'
					? a.monthly_amount - b.monthly_amount
					: b.monthly_amount - a.monthly_amount;
			});
		}

		return transactions;
	});

	// MARK: - Frequency parsing

	function parseFrequencyText(frequency: ScheduledTransactionFrequency) {
		switch (frequency) {
			case 'never':
				return 'Never';
			case 'daily':
				return 'Daily';
			case 'weekly':
				return 'Weekly';
			case 'everyOtherWeek':
				return 'Every Other Week';
			case 'twiceAMonth':
				return 'Twice Monthly';
			case 'monthly':
				return 'Monthly';
			case 'everyOtherMonth':
				return 'Every Other Month';
			case 'every3Months':
				return 'Every 3 Months';
			case 'every4Months':
				return 'Every 4 Months';
			case 'twiceAYear':
				return 'Twice Yearly';
			case 'yearly':
				return 'Yearly';
			case 'everyOtherYear':
				return 'Every Other Year';
			default:
				return frequency;
		}
	}

	// MARK: - Date formatting

	function convertToReadableDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// MARK: - Relative date formatting

	function getRelativeDate(dateString: string) {
		const today = new Date();
		const targetDate = new Date(dateString);
		const diffTime = targetDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays > 0) {
			return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
		} else if (diffDays < 0) {
			return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
		} else {
			return 'today';
		}
	}

	// MARK: - Amount formatting

	function determineAmountStringFromBudgetCurrency(amount: number) {
		const budgetCurrency = currentBudget?.currency_format?.iso_code || 'USD';
		const formatter = new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: budgetCurrency
		});
		return formatter.format(amount / 1000);
	}

	// MARK: - Toggle exclude status

	async function toggleExcluded(billId: string, currentExcluded: boolean) {
		await db.scheduled_transactions.update(billId, {
			excluded: !currentExcluded
		});
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

	// MARK: - Total of bills per month

	let totalBillsPerMonth = $derived.by(() => {
		const transactions = rawBills;
		if (!transactions) return 0;

		// Filter out excluded bills
		const includedTransactions = transactions.filter((t) => !t.excluded);

		// Reduce bills to monthly based on frequency (e.g., weekly bills are multiplied by 4, yearly bills are divided by 12, etc.) and sum them up
		return includedTransactions.reduce((total, transaction) => {
			return total + transaction.amount * getFrequencyMultiplier(transaction.frequency);
		}, 0);
	});
</script>

<svelte:head>
	<title>Plan | Bills (For YNAB)</title>

	<!-- MARK: Styles -->

	<style>
		.container {
			gap: 4rem;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 2rem;
		}
		.bill {
			border: 1px solid #ddd;
			padding: 8px;
			gap: 1px;
			position: relative;
		}
		.bill.excluded {
			opacity: 0.5;
			background-color: #f5f5f5;
		}
		.toggle-exclude {
			position: absolute;
			top: 8px;
			right: 8px;
			background: white;
			border: 1px solid #ccc;
			border-radius: 4px;
			padding: 4px 8px;
			cursor: pointer;
			font-size: 14px;
			transition: all 0.2s;
			color: #333;
		}
		.toggle-exclude:hover {
			background: #f0f0f0;
		}
		.bill-details {
			list-style: none;
			padding: 0;
			margin: 0.5rem 0 0 1rem;
		}
		.bill-container {
			display: grid;
			gap: 16px;
			grid-template-columns: repeat(4, minmax(200px, 1fr));
		}
		.actions {
			display: flex;
			gap: 16px;
			align-items: center;
		}
		.options {
			display: flex;
			gap: 8px;
		}
		.stats {
			display: flex;
			gap: 16px;
		}
		.monthly-equivalent {
			margin-bottom: 10px;
		}
		@media screen and (max-width: 600px) {
			.bill-container {
				display: grid;
				gap: 16px;
				width: 100%;
				grid-template-columns: 1fr;
			}
			.actions {
				flex-direction: column;
				width: 100%;
			}
			.actions a,
			.actions button {
				width: 100%;
			}
		}

		@media (prefers-color-scheme: dark) {
			.bill {
				border-color: #444;
			}
			.bill.excluded {
				opacity: 0.25;
				background-color: #000;
			}
			.toggle-exclude {
				background: #222;
				border-color: #555;
				color: #eee;
			}
			.toggle-exclude:hover {
				background: #333;
			}
		}
	</style>
</svelte:head>

<main class="container">
	{#if budgetId}
		<!-- MARK: - Actions -->
		<div class="actions">
			<a href={resolve('/')}>Back to Plans</a>
			<button disabled={fetchingScheduledTransactions} onclick={getScheduledTransactionsForBudget}>
				{fetchingScheduledTransactions ? 'Fetching...' : 'Fetch Scheduled Transactions'}
			</button>
			<button disabled={resettingData} onclick={resetDataForBudget}>
				{resettingData ? 'Resetting...' : 'Reset Data'}
			</button>
		</div>
		<!-- MARK: - Options -->
		<div class="options">
			<div>
				<label for="sort_by">Sort By:</label>
				<select id="sort_by" bind:value={sortBy}>
					<option value="date_next">Next Due Date</option>
					<option value="monthly_amount">Monthly Amount</option>
				</select>
			</div>
			<div>
				<label for="sort_direction">Sort Direction:</label>
				<select id="sort_direction" bind:value={sortDirection}>
					<option value="asc">Ascending</option>
					<option value="desc">Descending</option>
				</select>
			</div>
		</div>
		<!-- MARK: - Stats -->
		<div class="stats">
			<p>
				Total Bills Per Month:
				<strong>
					{determineAmountStringFromBudgetCurrency(-totalBillsPerMonth)}
				</strong>
			</p>
			<p>
				Total Bills Per Year:
				<strong>
					{determineAmountStringFromBudgetCurrency(-totalBillsPerMonth * 12)}
				</strong>
			</p>
		</div>
		<!-- MARK: - Bills -->
		<h1>Bills</h1>
		<div class="bill-container">
			{#each bills as bill (bill.id)}
				<div class="bill" class:excluded={bill.excluded}>
					<button
						class="toggle-exclude"
						onclick={() => toggleExcluded(bill.id, bill.excluded ?? false)}
						title={bill.excluded ? 'Include in calculations' : 'Exclude from calculations'}
					>
						{bill.excluded ? '👁️' : '✓'}
					</button>
					<p>
						{determineAmountStringFromBudgetCurrency(-bill.amount)} ({parseFrequencyText(
							bill.frequency
						)}) to
						{bill.payee_name}
					</p>
					<ul class="bill-details">
						<li class="monthly-equivalent">
							Monthly Equivalent: {determineAmountStringFromBudgetCurrency(
								-(bill.monthly_amount ?? bill.amount * getFrequencyMultiplier(bill.frequency))
							)}
						</li>
						<li>{bill.category_name}</li>
						<li>
							<strong>
								Due: {convertToReadableDate(bill.date_next)} ({getRelativeDate(bill.date_next)})
							</strong>
						</li>
						<li>
							<em>
								First Paid On: {convertToReadableDate(bill.date_first)}
							</em>
						</li>
					</ul>
					<p>{bill.memo}</p>
				</div>
			{/each}
		</div>
	{/if}
</main>
