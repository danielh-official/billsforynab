<script lang="ts">
	import { db } from '$lib/db';
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

	// YAGNI approach for now: just load first 10 budgets. If I seriously have users who want to work with all 1 bajillion of their budgets, then I'll implement more robust pagination and search features.

	const budgets = liveQuery(() => db.budgets.orderBy('id').limit(10).toArray());
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
		<button type="button" onclick={fetchBudgets} disabled={fetchingBudgets}>
			{fetchingBudgets ? 'Fetching...' : 'Fetch Plans'}
		</button>
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
							<td>
								<a href={resolve(`/plan/${budget.id}`)}>View</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{:else}
		<a data-sveltekit-reload href={authUrl}>Login With YNAB</a>
	{/if}
</div>
