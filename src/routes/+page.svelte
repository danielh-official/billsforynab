<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { db, type CustomBudgetDetail } from '$lib/db';
	import { liveQuery } from 'dexie';

	const budgets = liveQuery(() => db.budgets.orderBy('id').toArray());

	const demoBudgetAlreadyExists = $derived($budgets?.some((b) => b.id === 'demo') ?? false);

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
		goto(resolve('/plan/demo'));
	}

	const loggedIn = $derived.by(() => {
		return !!sessionStorage.getItem('ynab_access_token');
	});

	const defaultPlan = liveQuery(() =>
		db.budgets.toArray().then((budget) => budget.filter((x) => x.is_default)[0])
	);

	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Bills (For YNAB)',
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'Web',
		description:
			'A companion app for YNAB to manage your bills (repeating transactions). Features two-way sync with YNAB, monthly/yearly totals, bill history, and local-first storage.',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		url: 'https://billsforynab.com'
	});
</script>

<svelte:head>
	<title>Bills (For YNAB)</title>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${jsonLd}</` + `script>`}
</svelte:head>

<div
	class="mx-auto hidden w-full max-w-4xl rounded-xl border border-stone-200 bg-stone-100 p-3 shadow-sm md:block dark:border-stone-700 dark:bg-stone-800"
>
	<div class="mb-2 flex items-center gap-1.5 px-1">
		<span class="h-3 w-3 rounded-full bg-stone-300 dark:bg-stone-600"></span>
		<span class="h-3 w-3 rounded-full bg-stone-300 dark:bg-stone-600"></span>
		<span class="h-3 w-3 rounded-full bg-stone-300 dark:bg-stone-600"></span>
	</div>
	<div class="overflow-hidden rounded-lg">
		<enhanced:img
			src="$lib/assets/bills.light.png"
			alt="Bills screenshot"
			class="w-full dark:hidden"
		/>
		<enhanced:img
			src="$lib/assets/bills.dark.png"
			alt="Bills screenshot"
			class="hidden w-full dark:block"
		/>
	</div>
</div>

<div class="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
	<div class="flex flex-col gap-3">
		<h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100">Bills (For YNAB)</h1>
		<p class="text-stone-500 dark:text-stone-400">
			A companion app for YNAB to manage your bills (i.e., repeating transactions).
		</p>
		<ul
			class="list-disc space-y-1 pl-5 text-left text-sm text-stone-500 md:ml-10 dark:text-stone-400"
		>
			<li><b>Two-way sync</b>: Sync to and from YNAB.</li>
			<li><b>Special features</b>: Monthly/yearly totals, bill history.</li>
			<li><b>Local storage</b>: Your YNAB data, only stored in YNAB.</li>
		</ul>
	</div>

	<div class="mt-10 mb-3">
		{#if loggedIn && $defaultPlan}
			{#if $defaultPlan}
				<a
					href={resolve(`/plan/${$defaultPlan?.id}`)}
					class="rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/30 dark:text-stone-400 dark:hover:bg-stone-800/50"
				>
					Use App
				</a>
			{:else}
				<a
					href={resolve(`/plans`)}
					class="rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/30 dark:text-stone-400 dark:hover:bg-stone-800/50"
				>
					Use App
				</a>
			{/if}
		{:else}
			<a
				href={resolve('/login')}
				class="rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/30 dark:text-stone-400 dark:hover:bg-stone-800/50"
			>
				Login to YNAB
			</a>
		{/if}
	</div>

	<p class="text-md mt-4 max-w-md text-stone-500 dark:text-stone-400">
		Not sure yet? Try the demo. <i>No YNAB account required.</i>
	</p>

	<div class="flex flex-wrap justify-center gap-3">
		{#if demoBudgetAlreadyExists}
			<a
				href={resolve('/plan/demo')}
				class="rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/30 dark:text-stone-400 dark:hover:bg-stone-800/50"
			>
				Try Demo
			</a>
		{:else}
			<button
				type="button"
				onclick={createDemoPlan}
				class="rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/30 dark:text-stone-400 dark:hover:bg-stone-800/50"
			>
				Try Demo
			</button>
		{/if}
	</div>
</div>
