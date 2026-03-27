<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { liveQuery } from 'dexie';
	import { type Category } from 'ynab/dist/models';
	import { db, type TransactionDetail } from '$lib/db';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import FetchDataButton from '$lib/components/FetchDataButton.svelte';
	import ResetDataButton from '$lib/components/ResetDataButton.svelte';
	import DeleteBillButton from '$lib/components/DeleteBillButton.svelte';
	import PublishDraftBillButton from '$lib/components/PublishDraftBillButton.svelte';
	import ToggleBillInclusionButton from '$lib/components/ToggleBillInclusionButton.svelte';
	import BillDueDate from '$lib/components/BillDueDate.svelte';
	import LastFetchedDate from '$lib/components/LastFetchedDate.svelte';
	import ParsedFrequency from '$lib/components/ParsedFrequency.svelte';
	import FirstPaidDate from '$lib/components/FirstPaidDate.svelte';
	import {
		determineAmountStringFromBudgetCurrency,
		getFrequencyMultiplier,
		getActivityStatus
	} from '$lib';
	import EditBillLink from '$lib/components/EditBillLink.svelte';

	// MARK: - Mount and budgetId extraction

	let budgetId = $state<string | null>(null);

	const isDemo = $derived.by(() => {
		return page.params.id === 'demo';
	});

	let allowsBothReadAndWriteAccess: boolean = $state(false);
	let demoAccessType = $state<'read-only' | 'read-and-write'>('read-only');

	// Load demo access type from sessionStorage and listen for changes
	$effect(() => {
		if (!browser) return;

		// Initial load
		const stored = sessionStorage.getItem('demo_access_type');
		if (stored === 'read-only' || stored === 'read-and-write') {
			demoAccessType = stored;
		}

		// Listen for custom events when demo access type changes
		const handleDemoAccessChange = (event: CustomEvent<'read-only' | 'read-and-write'>) => {
			demoAccessType = event.detail;
		};

		window.addEventListener('demoAccessTypeChange', handleDemoAccessChange as EventListener);

		return () => {
			window.removeEventListener('demoAccessTypeChange', handleDemoAccessChange as EventListener);
		};
	});

	$effect(() => {
		if (!browser) return;

		const ynabTokenWrite = sessionStorage.getItem('ynab_token_write');
		allowsBothReadAndWriteAccess = ynabTokenWrite === 'true';
	});

	// Effective write access considering both real access and demo mode settings
	const effectiveWriteAccess = $derived.by(() => {
		if (isDemo) {
			return demoAccessType === 'read-and-write';
		}
		return allowsBothReadAndWriteAccess;
	});

	$effect(() => {
		if (!browser) return;

		const id = page.params.id;

		if (!id) {
			goto(resolve('/plans'));
			return;
		}

		budgetId = id;
	});

	// MARK: - Fetching current budget from IndexedDB with live updates

	let currentBudget = liveQuery(() => db.budgets.get(budgetId!));

	let availableAccounts = $derived.by(() => {
		return (
			$currentBudget?.accounts
				?.filter((account) => !(account.deleted || account.closed))
				?.sort((a, b) => a.name.localeCompare(b.name)) ?? []
		);
	});

	// MARK: - Sorting options with localStorage persistence

	type SortPreset = 'monthly_amount_desc' | 'date_next_asc';
	let sortPreset = $state<SortPreset>('date_next_asc');

	// MARK: - Layout preset with localStorage persistence

	type LayoutPreset = 'grid' | 'list';
	let layoutPreset = $state<LayoutPreset>('grid');

	// MARK: - Loading state for async bill operations

	let billsBeingSynced = new SvelteSet<string>();

	// MARK: - Date validation constraints (YNAB API requires date within 1 week ago to 5 years in future)

	$effect(() => {
		if (!browser) return;

		if (typeof localStorage === 'undefined') return;

		const stored = localStorage.getItem('sort_preset');
		if (stored === 'monthly_amount_desc' || stored === 'date_next_asc') {
			sortPreset = stored;
		}
	});

	$effect(() => {
		if (!browser) return;
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem('sort_preset', sortPreset);
	});

	$effect(() => {
		if (!browser) return;
		if (typeof localStorage === 'undefined') return;
		const stored = localStorage.getItem('layout_preset');
		if (stored === 'grid' || stored === 'list') {
			layoutPreset = stored;
		}
	});

	$effect(() => {
		if (!browser) return;
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem('layout_preset', layoutPreset);
	});

	// MARK: - Bills list with live updates from IndexedDB

	let rawBills = liveQuery(() =>
		db.scheduled_transactions
			.where('budget_id')
			.equals(budgetId!)
			.and((transaction) => !transaction.deleted && transaction.amount < 0)
			.toArray()
	);

	// Sort transactions reactively based on sortPreset
	let bills = $derived.by(() => {
		const transactions = $rawBills;
		if (!transactions) return [];

		if (sortPreset === 'date_next_asc') {
			return [...transactions].sort((a, b) => {
				const dateA = new Date(a.date_next).getTime();
				const dateB = new Date(b.date_next).getTime();
				return dateA - dateB;
			});
		}
		if (sortPreset === 'monthly_amount_desc') {
			return [...transactions].sort((a, b) => {
				if (a.monthly_amount === undefined || b.monthly_amount === undefined) {
					return 0;
				}
				return a.monthly_amount - b.monthly_amount;
			});
		}

		return transactions;
	});

	// MARK: - Total of bills per month

	let totalBillsPerMonth = $derived.by(() => {
		const transactions = $rawBills;
		if (!transactions) return 0;

		// Filter out excluded bills
		const includedTransactions = transactions.filter((t) => !t.excluded);

		// Reduce bills to monthly based on frequency (e.g., weekly bills are multiplied by 4, yearly bills are divided by 12, etc.) and sum them up
		return includedTransactions.reduce((total, transaction) => {
			return total + transaction.amount * getFrequencyMultiplier(transaction.frequency);
		}, 0);
	});

	function getCategory(categoryId: string | null | undefined): Category | null {
		if (!budgetId || !categoryId) return null;

		const groups = $categoryGroups?.filter((g) => g.budget_id === budgetId) ?? [];

		for (const group of groups) {
			const category = group.categories.find((c) => c.id === categoryId);
			if (category) {
				return category;
			}
		}

		return null;
	}

	// MARK: - History helpers

	function getLatestTransaction(history: TransactionDetail[]): TransactionDetail {
		return history.reduce((latest, t) => (t.date > latest.date ? t : latest));
	}

	function relativeDate(dateStr: string): string {
		const diffDays = Math.floor(
			(new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
		);
		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
		}
		if (diffDays < 365) {
			const months = Math.floor(diffDays / 30);
			return `${months} month${months > 1 ? 's' : ''} ago`;
		}
		const years = Math.floor(diffDays / 365);
		return `${years} year${years > 1 ? 's' : ''} ago`;
	}

	let categoryGroups = liveQuery(() => {
		return db.category_groups
			.where('budget_id')
			.equals(budgetId || '')
			.toArray()
			.then((groups) => {
				groups.sort((a, b) => a.name.localeCompare(b.name));

				groups.forEach((group) => {
					group.categories.sort((a, b) => a.name.localeCompare(b.name));
				});

				return groups;
			});
	});

	let fetchingData = $state(false);
	let pendingDeleteBillId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Plan &mdash; {$currentBudget?.name} | Bills (For YNAB)</title>
</svelte:head>

<!-- MARK: - Window Events -->

<svelte:window
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			goto(resolve(`/plans`));
		}
	}}
/>

{#if fetchingData}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm dark:bg-stone-900/80"
		role="status"
		aria-live="polite"
	>
		<svg
			class="h-8 w-8 animate-spin text-stone-600 dark:text-stone-400"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			></path>
		</svg>
		<p class="text-lg font-medium text-stone-800 dark:text-stone-100">Fetching data…</p>
		<p class="max-w-xs text-center text-sm text-stone-500 dark:text-stone-400">
			Please don't close this tab or navigate away until it's finished.
		</p>
	</div>
{/if}

<div class="flex w-full flex-col items-center gap-8">
	{#if budgetId}
		<div class="w-full">
			<Breadcrumb
				items={[
					{ label: 'Home', href: resolve('/') },
					{ label: 'Plans', href: resolve('/plans') },
					{ label: $currentBudget?.name ?? 'Plan' }
				]}
			/>
			<h1 class="mt-2 text-lg font-medium text-stone-800 dark:text-stone-200">
				{$currentBudget?.name ?? 'Plan'}
			</h1>
		</div>

		<!-- MARK: - Actions -->
		<div class="flex w-full flex-wrap items-center gap-3">
			<FetchDataButton currentBudget={$currentBudget} {isDemo} bind:fetchingData />
			<ResetDataButton currentBudget={$currentBudget} />
			{#if effectiveWriteAccess}
				<a
					href={effectiveWriteAccess
						? resolve(`/plan/${budgetId}/bill/new`)
						: resolve(`/plan/${budgetId}`)}
					class="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600 {!effectiveWriteAccess
						? 'pointer-events-none opacity-50'
						: ''}"
					data-tooltip={effectiveWriteAccess
						? undefined
						: 'You need write access to create bills. Click "Login With YNAB (Read and Write)" to enable this feature.'}
				>
					Create Bill
				</a>
			{/if}
		</div>

		<!-- MARK: - Options -->
		<div class="mx-auto flex max-w-md flex-wrap items-center justify-center gap-4 lg:w-full">
			<label for="sort_preset" class="text-sm text-stone-700 dark:text-stone-300"> Sort: </label>
			<select
				id="sort_preset"
				bind:value={sortPreset}
				class="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
			>
				<option value="monthly_amount_desc">Monthly Amount (Descending)</option>
				<option value="date_next_asc">Next Due Date (Ascending)</option>
			</select>
			<div
				class="flex rounded-lg border border-stone-300 dark:border-stone-600"
				role="group"
				aria-label="Layout"
			>
				<button
					type="button"
					class="rounded-l-md border-r border-stone-300 px-2.5 py-1.5 text-xs font-medium transition-colors dark:border-stone-600 {layoutPreset ===
					'grid'
						? 'bg-stone-700 text-white dark:bg-stone-600 dark:text-stone-100'
						: 'bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700/50'}"
					onclick={() => {
						layoutPreset = 'grid';
					}}
					aria-pressed={layoutPreset === 'grid'}
				>
					Grid
				</button>
				<button
					type="button"
					class="rounded-r-md px-2.5 py-1.5 text-xs font-medium transition-colors {layoutPreset ===
					'list'
						? 'bg-stone-700 text-white dark:bg-stone-600 dark:text-stone-100'
						: 'bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700/50'}"
					onclick={() => {
						layoutPreset = 'list';
					}}
					aria-pressed={layoutPreset === 'list'}
				>
					List
				</button>
			</div>
		</div>

		<!-- MARK: - Stats -->
		<section
			aria-label="Bill totals"
			class="sticky top-2 z-10 mb-4 flex w-full flex-wrap gap-6 rounded-lg border-b border-stone-200 bg-stone-50 px-4 py-4 shadow-sm lg:top-0 dark:border-stone-700 dark:bg-stone-900/50"
		>
			<p class="text-sm text-stone-600 dark:text-stone-400">
				Total per month: <strong class="text-stone-900 dark:text-stone-100"
					>{determineAmountStringFromBudgetCurrency(-totalBillsPerMonth, $currentBudget)}</strong
				>
			</p>
			<p class="text-sm text-stone-600 dark:text-stone-400">
				Total per year: <strong class="text-stone-900 dark:text-stone-100"
					>{determineAmountStringFromBudgetCurrency(
						-totalBillsPerMonth * 12,
						$currentBudget
					)}</strong
				>
			</p>
			<LastFetchedDate currentBudget={$currentBudget} />
			<p class="text-sm text-stone-600 dark:text-stone-400">
				Excluded: <strong class="text-stone-900 dark:text-stone-100"
					>{bills.filter((bill) => bill.excluded).length}</strong
				>
			</p>
		</section>

		<!-- MARK: - Bills -->
		{#if bills.length === 0}
			<div
				class="w-full rounded-lg border border-dashed border-stone-200 bg-stone-100 py-12 text-center dark:border-stone-700 dark:bg-stone-800/30"
			>
				<p class="mb-4 text-stone-600 dark:text-stone-400">No bills found.</p>
			</div>
		{:else if layoutPreset === 'grid'}
			<!-- MARK: Grid View -->
			<ul
				class="m-0 grid w-full list-none grid-cols-2 gap-4 p-0 lg:grid-cols-3 xl:grid-cols-4"
				aria-label="Bills"
			>
				{#each bills as bill (bill.id)}
					<li
						class="relative rounded-lg border p-4 transition-all {bill.excluded
							? 'bg-stone-100 opacity-50 dark:bg-stone-800/50'
							: 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'} {!bill.published
							? 'border-dashed border-amber-400 dark:border-amber-600'
							: ''}"
					>
						<div class="mb-2 flex justify-end gap-2">
							{#if pendingDeleteBillId !== bill.id}
								<ToggleBillInclusionButton {bill} />
							{/if}
							{#if effectiveWriteAccess}
								{#if pendingDeleteBillId !== bill.id}
									<EditBillLink {bill} {billsBeingSynced} {budgetId} />
								{/if}
								<DeleteBillButton
									{bill}
									{isDemo}
									{billsBeingSynced}
									{budgetId}
									bind:pendingDeleteBillId
								/>
								{#if !bill.published && pendingDeleteBillId !== bill.id}
									<PublishDraftBillButton
										budget={$currentBudget}
										{bill}
										{isDemo}
										{billsBeingSynced}
										{availableAccounts}
										categoryGroups={$categoryGroups}
									/>
								{/if}
							{/if}
						</div>
						{#if !bill.published}
							<span
								class="absolute top-2 left-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white"
							>
								DRAFT
							</span>
						{/if}
						{#if billsBeingSynced.has(bill.id)}
							<span
								class="absolute top-2 right-2 rounded bg-stone-700 px-2 py-0.5 text-xs font-medium text-white"
							>
								Syncing…
							</span>
						{/if}
						<div class="space-y-2 text-sm">
							<p class="font-medium text-stone-900 dark:text-stone-100">
								{determineAmountStringFromBudgetCurrency(
									-(bill.monthly_amount ?? bill.amount * getFrequencyMultiplier(bill.frequency)),
									$currentBudget
								)}
								<span class="font-normal text-stone-500 dark:text-stone-400">/mo</span>
							</p>
							<BillDueDate {bill} />
							<p class="text-stone-700 dark:text-stone-300">
								{determineAmountStringFromBudgetCurrency(-bill.amount, $currentBudget)}
								<span class="text-stone-500 dark:text-stone-400">
									(<ParsedFrequency {bill} />)
								</span>
								to <strong>{bill.payee_name ?? 'unspecified payee'}</strong>
							</p>
							<ul
								class="mt-2 hidden space-y-0.5 text-xs text-stone-500 md:block dark:text-stone-400"
							>
								<li>
									Category: {bill.category_name}
									{getCategory(bill.category_id)
										? `(${getCategory(bill.category_id)?.category_group_name})`
										: ''}
								</li>
								<li>Account: {bill.account_name}</li>
								<li><em>First paid: <FirstPaidDate {bill} /></em></li>
							</ul>
							{#if bill.memo}
								<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{bill.memo}</p>
							{/if}
							{#if bill.history && bill.history.length > 0}
								{@const latestTx = getLatestTransaction(bill.history)}
								{@const status = getActivityStatus(bill, latestTx.date)}
								<div
									class="mt-2 border-t border-stone-200 pt-2 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400"
								>
									<p>
										Latest Date: {relativeDate(latestTx.date)}{#if status}
											<span class="m-2">
												(<span
													class={{
														'text-green-600 dark:text-green-400': status.active,
														'text-amber-600 dark:text-amber-400': !status.active
													}}>{status.label}</span
												>)
											</span>
										{/if}
									</p>
									<p>
										Latest Amount: {determineAmountStringFromBudgetCurrency(
											-latestTx.amount,
											$currentBudget
										)}
									</p>
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<!-- MARK: List View -->
			<ul
				class="m-0 w-full list-none divide-y divide-stone-200 rounded-lg border border-stone-200 p-0 dark:divide-stone-700 dark:border-stone-700"
				aria-label="Bills"
			>
				{#each bills as bill (bill.id)}
					<li
						class="relative flex items-center gap-3 px-3 py-2 transition-all first:rounded-t-lg last:rounded-b-lg {bill.excluded
							? 'bg-stone-100 opacity-50 dark:bg-stone-800/50'
							: 'bg-white dark:bg-stone-800'} {!bill.published
							? 'border-l-2 border-l-amber-400 dark:border-l-amber-600'
							: ''}"
					>
						{#if !bill.published}
							<span
								class="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white"
							>
								DRAFT
							</span>
						{/if}
						{#if billsBeingSynced.has(bill.id)}
							<span
								class="shrink-0 rounded bg-stone-700 px-1.5 py-0.5 text-xs font-medium text-white"
							>
								Syncing…
							</span>
						{/if}
						<div class="min-w-0 flex-1 text-sm">
							<span class="font-medium text-stone-900 dark:text-stone-100"
								>{bill.payee_name ?? 'unspecified payee'}</span
							>
							<div class="text-stone-500 dark:text-stone-400">
								{determineAmountStringFromBudgetCurrency(-bill.amount, $currentBudget)}
								(<ParsedFrequency {bill} />)
							</div>
							<div class="mt-4 text-stone-500 dark:text-stone-400"><BillDueDate {bill} /></div>
							{#if bill.history && bill.history.length > 0}
								{@const latestTx = getLatestTransaction(bill.history)}
								{@const status = getActivityStatus(bill, latestTx.date)}
								<div class="mt-1 text-xs text-stone-400 dark:text-stone-500">
									<span class="font-medium text-stone-600 dark:text-stone-400">History</span>
									· Last: {relativeDate(latestTx.date)}{#if status}
										<span class="m-2">
											(<span
												class={{
													'text-green-600 dark:text-green-400': status.active,
													'text-amber-600 dark:text-amber-400': !status.active
												}}>{status.label}</span
											>)
										</span>
									{/if}
									· {determineAmountStringFromBudgetCurrency(-latestTx.amount, $currentBudget)}
								</div>
							{/if}
						</div>
						<div
							class="hidden shrink-0 text-right text-xs text-stone-500 sm:block dark:text-stone-400"
						>
							<p class="my-2 text-stone-700 dark:text-stone-300">
								{determineAmountStringFromBudgetCurrency(
									-(bill.monthly_amount ?? bill.amount * getFrequencyMultiplier(bill.frequency)),
									$currentBudget
								)}<span class="text-stone-500 dark:text-stone-400">/mo</span>
							</p>
							<p>{bill.category_name}</p>
							<p>{bill.account_name}</p>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							{#if pendingDeleteBillId !== bill.id}
								<ToggleBillInclusionButton {bill} />
							{/if}
							{#if effectiveWriteAccess}
								{#if pendingDeleteBillId !== bill.id}
									<EditBillLink {bill} {billsBeingSynced} {budgetId} />
								{/if}
								<DeleteBillButton
									{bill}
									{isDemo}
									{billsBeingSynced}
									{budgetId}
									bind:pendingDeleteBillId
                                    layout={layoutPreset}
								/>
								{#if !bill.published && pendingDeleteBillId !== bill.id}
									<PublishDraftBillButton
										budget={$currentBudget}
										{bill}
										{isDemo}
										{billsBeingSynced}
										{availableAccounts}
										categoryGroups={$categoryGroups}
									/>
								{/if}
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
