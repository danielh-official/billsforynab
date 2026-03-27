<script lang="ts">
	import { db } from '$lib/db';
	import { fetchBudgets } from '$lib';
	import { liveQuery } from 'dexie';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';

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

	async function handleFetchBudgets() {
		if (!authToken) {
			alert('No access token found. Please login again.');
			return;
		}

		setFetchingBudgets(true);
		const result = await fetchBudgets(authToken);
		if (!result.success) {
			alert(result.error);
		}
		setFetchingBudgets(false);
	}

	const budgets = liveQuery(() => db.budgets.orderBy('id').toArray());

	let pendingDeleteId = $state<string | null>(null);

	function deleteBudget(id: string) {
		if (pendingDeleteId !== id) {
			pendingDeleteId = id;
			return;
		}

		pendingDeleteId = null;
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

		// Find all category groups associated with this budget and delete them
		db.category_groups
			.where('budget_id')
			.equals(id)
			.toArray()
			.then((groups) => {
				const deletePromises = groups.map((group) => db.category_groups.delete(group.id));
				return Promise.all(deletePromises);
			})
			.catch((error) => {
				console.error('Failed to delete category groups for budget:', error);
			});
	}
</script>

<svelte:head>
	<title>Plans | Bills (For YNAB)</title>
</svelte:head>

<svelte:window
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			goto(resolve(`/`));
		}
	}}
/>

<div class="mx-auto w-full max-w-xl px-4 py-4">
	<Breadcrumb items={[{ label: 'Home', href: resolve('/') }, { label: 'Plans' }]} />
</div>

<div class="mx-auto flex w-full max-w-xl flex-col items-center gap-10">
	<button
		type="button"
		class="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-500 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800/30 dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-stone-200"
		onclick={handleFetchBudgets}
		disabled={fetchingBudgets || !authToken}
	>
		{fetchingBudgets ? 'Fetching…' : 'Fetch plans'}
	</button>

	<section class="w-full text-left">
		<h2 class="mb-3 text-sm font-medium text-stone-800 dark:text-stone-200">Your plans</h2>
		{#if $budgets && $budgets.length > 0}
			<ul
				class="divide-y divide-stone-200 overflow-hidden rounded-lg border border-stone-200 dark:divide-stone-700 dark:border-stone-700"
			>
				{#each $budgets as budget (budget.id)}
					<li
						class="flex items-center justify-between gap-4 bg-white px-4 py-3 transition-colors hover:bg-stone-50 dark:bg-stone-800/30 dark:hover:bg-stone-800/50"
					>
						<div class="min-w-0">
							<a
								href={resolve(`/plan/${budget.id}`)}
								class="block truncate font-medium text-stone-800 hover:underline dark:text-stone-200"
							>
								{budget.name}
							</a>
							{#if budget.is_default}
								<span class="text-xs text-stone-500 dark:text-stone-400">Default</span>
							{/if}
						</div>
						<div class="flex shrink-0 gap-3 text-sm">
							{#if pendingDeleteId === budget.id}
								<button
									type="button"
									class="cursor-pointer text-red-600 hover:underline dark:text-red-400"
									onclick={() => deleteBudget(budget.id)}
									aria-label="Confirm delete {budget.name}"
								>
									Confirm
								</button>
								<button
									type="button"
									class="cursor-pointer text-stone-500 hover:underline dark:text-stone-400"
									onclick={() => (pendingDeleteId = null)}
									aria-label="Cancel delete {budget.name}"
								>
									Cancel
								</button>
							{:else}
								<a
									href={resolve(`/plan/${budget.id}`)}
									aria-label="View {budget.name}"
									class="text-stone-600 hover:underline dark:text-stone-400">View</a
								>
								<button
									type="button"
									class="cursor-pointer text-stone-500 hover:text-red-600 hover:underline dark:text-stone-400 dark:hover:text-red-400"
									onclick={() => deleteBudget(budget.id)}
									aria-label="Delete {budget.name}"
								>
									Delete
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-6 text-sm text-stone-500 dark:text-stone-400">No plans found.</p>
		{/if}
	</section>
</div>
