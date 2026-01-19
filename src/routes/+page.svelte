<script lang="ts">
	import { db, type CustomBudgetDetail } from '$lib/db';
	import { liveQuery } from 'dexie';
	import { page } from '$app/state';
	import type { BudgetDetail, BudgetSummaryResponse } from 'ynab/dist/models';
	import { browser } from '$app/environment';
	import { PUBLIC_BASE_PATH, PUBLIC_YNAB_CLIENT_ID } from '$env/static/public';
	import { resolve } from '$app/paths';

	let currentUrl = $derived.by(() => {
		if (browser) {
			return page.url.origin + PUBLIC_BASE_PATH;
		}
		return '';
	});

	let authUrl = $derived.by(() => {
		// The default client ID only works with production url.
		// Set the PUBLIC_YNAB_CLIENT_ID to a client that works with your dev URL.
		const clientId =
			PUBLIC_YNAB_CLIENT_ID.trim().length > 0
				? PUBLIC_YNAB_CLIENT_ID
				: 'pSUArM_scyhWolG84x64phZCixdv4rDXkyr3JpzoN34';

		const redirectUri = `${currentUrl}/callback`;

		return `https://app.ynab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token`;
	});

	let authToken = $derived.by(() => {
		if (browser) {
			return sessionStorage.getItem('ynab_access_token') || null;
		}
		return null;
	});

	let fetchingBudgets = $state(false);

	function setFetchingBudgets(value: boolean) {
		fetchingBudgets = value;
	}

	async function fetchBudgets() {
		if (!authToken) {
			console.error('No access token found.');
			return;
		}

		setFetchingBudgets(true);

		const budgetsResponse = await fetch('https://api.ynab.com/v1/budgets', {
			headers: {
				Authorization: `Bearer ${authToken}`
			}
		});

		if (budgetsResponse.status === 401) {
			console.warn('Unauthorized. Clearing access token.');
			sessionStorage.removeItem('ynab_access_token');
			return;
		}

		if (!budgetsResponse.ok) {
			console.error('Failed to fetch budgets:', budgetsResponse.statusText);
			return;
		}

		const budgetsData: BudgetSummaryResponse = await budgetsResponse.json();

		const defaultBudgetId = budgetsData.data.default_budget?.id;

		const budgets = budgetsData.data.budgets.map((b: BudgetDetail) => {
			return {
				...b,
				is_default: b.id === defaultBudgetId
			};
		});

		db.budgets.bulkPut(budgets);

		setFetchingBudgets(false);
	}

	const budgets = liveQuery(() => db.budgets.orderBy('id').toArray());

	function createDemoPlan() {
		const demoBudget: CustomBudgetDetail = {
			id: 'demo',
			name: 'Demo',
			last_modified_on: new Date().toISOString(),
			first_month: new Date().toISOString().substring(0, 7),
			last_month: new Date().toISOString().substring(0, 7),
			is_default: false
		};

		db.budgets.put(demoBudget);
	}

	let demoBudgetAlreadyExists = $derived.by(() => {
		if ($budgets) {
			return $budgets.some((b) => b.id === 'demo');
		}
		return false;
	});

	function deleteBudget(id: string) {
		if (confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
			db.budgets.delete(id);

			// Find all scheduled transactions associated with this budget and delete them
			db.scheduled_transactions
				.where('budget_id')
				.equals(id)
				.toArray()
				.then((transactions) => {
					const deletePromises = transactions.map((tx) => db.scheduled_transactions.delete(tx.id));
					return Promise.all(deletePromises);
				})
				.catch((error) => {
					console.error('Failed to delete scheduled transactions for budget:', error);
				});
		}
	}
</script>

<svelte:head>
	<title>Home | Bills (For YNAB)</title>
	<style>
		.container {
			gap: 4rem;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 2rem;
		}
		.table {
			border-collapse: collapse;
			width: 100%;
			max-width: 600px;
		}
		.table th,
		.table td {
			border: 1px solid #ddd;
			padding: 8px;
			text-align: center;
		}
		.table th {
			background-color: #f2f2f2;
		}

		.disclaimer {
			max-width: 600px;
			text-align: center;
			font-size: 0.9rem;
			color: #666;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.fetch-budgets-button {
			padding: 0.5rem 1rem;
			font-size: 1rem;
			cursor: pointer;
		}

		.fetch-budgets-button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.create-demo-plan-button {
			padding: 0em 0em;
			background-color: transparent;
			color: blue;
			border: none;
			border-radius: none;
			cursor: pointer;
			font-size: 1rem;
		}

		.create-demo-plan-button:hover {
			text-decoration: underline;
		}

		.create-demo-plan-button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
			text-decoration: none;
			color: gray;
		}

		.row-actions {
			display: flex;
			gap: 0.5rem;
			justify-content: center;
		}

		.delete-budget-button {
			padding: 0rem 0rem;
			font-size: 1rem;
			cursor: pointer;
			background-color: transparent;
			color: #ff4d4f;
			border: none;
		}

		.delete-budget-button:hover {
			text-decoration: underline;
		}

		@media (prefers-color-scheme: dark) {
			.table th {
				background-color: #444;
			}
		}
	</style>
</svelte:head>

<div class="container">
	{#if authToken}
		<p>Access token found. You are logged in.</p>
	{:else}
		<a data-sveltekit-reload href={authUrl}>Login With YNAB</a>
	{/if}
	<button
		class="fetch-budgets-button"
		type="button"
		onclick={fetchBudgets}
		disabled={fetchingBudgets || !authToken}
	>
		{fetchingBudgets ? 'Fetching...' : 'Fetch Plans'}
	</button>
	{#if !demoBudgetAlreadyExists}
		<div>
			On the fence? Click <button
				type="button"
				onclick={createDemoPlan}
				class="create-demo-plan-button"
				disabled={demoBudgetAlreadyExists}>here</button
			> to create a demo plan and try the tutorial. No YNAB account required!
		</div>
	{:else}
		<div>
			You already have a demo plan. Click <a href={resolve('/plan/demo')}>here</a> to view it.
		</div>
	{/if}
	{#if $budgets}
		<table class="table">
			<thead>
				<tr>
					<th>Plan Name</th>
					<th>Default</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each $budgets as budget (budget.id)}
					<tr>
						<td>{budget.name}</td>
						<td>{budget.is_default ? 'Yes' : 'No'}</td>
						<td class="row-actions">
							<a href={resolve(`/plan/${budget.id}`)}>View</a>
							<button class="delete-budget-button" onclick={() => deleteBudget(budget.id)}>
								Delete
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	<div class="disclaimer">
		<div><strong>Disclaimer</strong>: All your data is stored locally on your browser.</div>
		<div>
			Also, this app is open-source. Click <a
				href="https://github.com/danielh-official/billsforynab"
				target="_blank"
				rel="noopener noreferrer">here</a
			> to view the source code.
		</div>
	</div>
</div>
