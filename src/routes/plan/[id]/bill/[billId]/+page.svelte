<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { liveQuery } from 'dexie';
	import {
		ScheduledTransactionFrequency,
		type PostScheduledTransactionWrapper,
		type PutScheduledTransactionWrapper,
		type Account
	} from 'ynab/dist/models';
	import { db } from '$lib/db';
	import { resolve } from '$app/paths';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import type {
		CustomBudgetDetail,
		CustomCategoryGroupWithCategories,
		CustomScheduledTransactionDetail
	} from '$lib/db';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import {
		createBillInYNAB,
		createFakeDataForDemo,
		updateBillInYNAB,
		supportedFrequencies,
		unsupportedFrequencies
	} from '$lib';
	import { browser } from '$app/environment';
	import type { AccountType } from 'ynab/dist/models';

	const budgetId = $derived(page.params?.id ?? null);
	const billId = $derived(page.params?.billId ?? null);

	$effect(() => {
		if (!browser) return;
		if (!budgetId) {
			goto(resolve('/plans'));
			return;
		}
		if (!billId) {
			goto(resolve(`/plan/${budgetId}`));
		}
	});

	const isDemo = $derived.by(() => budgetId === 'demo');

	let allowsBothReadAndWriteAccess = $state(false);
	let demoAccessType = $state<'read-only' | 'read-and-write'>('read-only');

	$effect(() => {
		if (!browser) return;
		const stored = sessionStorage.getItem('demo_access_type');
		if (stored === 'read-only' || stored === 'read-and-write') {
			demoAccessType = stored;
		}
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
		allowsBothReadAndWriteAccess = sessionStorage.getItem('ynab_token_write') === 'true';
	});

	const effectiveWriteAccess = $derived.by(() => {
		if (isDemo) return demoAccessType === 'read-and-write';
		return allowsBothReadAndWriteAccess;
	});

	let currentBudget = liveQuery(() =>
		budgetId ? db.budgets.get(budgetId) : Promise.resolve(undefined)
	);
	let billQuery = liveQuery(() =>
		billId ? db.scheduled_transactions.get(billId) : Promise.resolve(undefined)
	);

	let _budget = $derived($currentBudget as CustomBudgetDetail | undefined);
	let existingBill = $derived($billQuery as CustomScheduledTransactionDetail | undefined);

	$effect(() => {
		if (!browser || !existingBill || !budgetId) return;
		if (existingBill.budget_id !== budgetId) {
			goto(resolve(`/plan/${budgetId}`));
		}
	});

	let availableAccounts = $derived.by((): Account[] => {
		return (
			_budget?.accounts
				?.filter((account: Account) => !(account.deleted || account.closed))
				?.sort((a: Account, b: Account) => a.name.localeCompare(b.name)) ?? []
		);
	});

	let groupedByTypeAvailableAccounts = $derived.by(() => {
		const typesSet = new SvelteSet<AccountType>();
		availableAccounts.forEach((account: Account) => {
			if (account.type) typesSet.add(account.type);
		});
		return Array.from(typesSet).sort((a, b) => a.localeCompare(b));
	});

	let categoryGroups = liveQuery(() => {
		if (!budgetId) return Promise.resolve([] as CustomCategoryGroupWithCategories[]);
		return db.category_groups
			.where('budget_id')
			.equals(budgetId)
			.toArray()
			.then((groups: CustomCategoryGroupWithCategories[]) => {
				groups.sort((a, b) => a.name.localeCompare(b.name));
				groups.forEach((group) => {
					group.categories.sort((a, b) => a.name.localeCompare(b.name));
				});
				return groups;
			});
	});

	let fetchingData = $state(false);

	async function fetchData() {
		if (!budgetId || !isDemo) return;
		fetchingData = true;
		await createFakeDataForDemo();
		fetchingData = false;
	}

	let minBillDate = $derived.by(() => {
		const oneWeekAgo = new SvelteDate();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
		return oneWeekAgo.toISOString().split('T')[0];
	});

	let maxBillDate = $derived.by(() => {
		const fiveYearsFromNow = new SvelteDate();
		fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
		return fiveYearsFromNow.toISOString().split('T')[0];
	});

	function parseAccountType(accountType: AccountType) {
		switch (accountType) {
			case 'checking':
				return 'Checking';
			case 'savings':
				return 'Savings';
			case 'cash':
				return 'Cash';
			case 'creditCard':
				return 'Credit Card';
			case 'lineOfCredit':
				return 'Line of Credit';
			case 'otherAsset':
				return 'Other Asset';
			case 'otherLiability':
				return 'Other Liability';
			default:
				return accountType;
		}
	}

	function getAccountName(accountId: string | undefined | null) {
		if (!accountId) return undefined;
		return availableAccounts.find((a: Account) => a.id === accountId)?.name;
	}

	function getCategoryName(categoryId: string | undefined | null) {
		if (!categoryId || !budgetId) return undefined;
		const groups = ($categoryGroups ?? []) as CustomCategoryGroupWithCategories[];
		for (const group of groups.filter((g) => g.budget_id === budgetId)) {
			const category = group.categories.find((c) => c.id === categoryId);
			if (category) return category.name;
		}
		return undefined;
	}

	function getFrequencyMultiplier(frequency: ScheduledTransactionFrequency) {
		switch (frequency) {
			case 'never':
				return 0;
			case 'daily':
				return 30;
			case 'weekly':
				return 4;
			case 'everyOtherWeek':
				return 2;
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

	let billFormData = $state({
		payee_name: '',
		account_id: '',
		date: '',
		amount: 0,
		memo: '',
		frequency: 'monthly' as ScheduledTransactionFrequency,
		category_id: ''
	});

	$effect(() => {
		const bill = existingBill;
		if (!bill || !billId) return;
		billFormData = {
			payee_name: bill.payee_name || '',
			account_id: bill.account_id,
			date: bill.date_next.split('T')[0],
			amount: Math.abs(bill.amount) / 1000,
			memo: bill.memo || '',
			frequency: bill.frequency as ScheduledTransactionFrequency,
			category_id: bill.category_id || ''
		};
	});

	const unsupportedFrequencyLock = $derived.by(() => {
		return (
			!!existingBill &&
			unsupportedFrequencies.includes(billFormData.frequency as ScheduledTransactionFrequency)
		);
	});

	async function handleSaveBill(shouldPublish: boolean) {
		if (!budgetId || !existingBill) {
			alert('Bill or budget not found.');
			return;
		}
		if (unsupportedFrequencyLock) {
			alert("This bill's frequency cannot be changed via the API.");
			return;
		}
		if (!billFormData.account_id || !billFormData.date) {
			alert('Account and date are required.');
			return;
		}
		const selectedDate = new SvelteDate(billFormData.date);
		const oneWeekAgo = new SvelteDate();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
		const fiveYearsFromNow = new SvelteDate();
		fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
		if (selectedDate < oneWeekAgo || selectedDate > fiveYearsFromNow) {
			alert('Date must not be more than 1 week in the past or over 5 years in the future.');
			return;
		}
		const amountMilliunits = -Math.abs(Math.round(Number(billFormData.amount || 0) * 1000));
		if (amountMilliunits === 0) {
			alert('Amount must be greater than zero.');
			return;
		}
		const frequency = billFormData.frequency || 'monthly';
		const accountName = getAccountName(billFormData.account_id);
		if (!accountName) {
			alert('Selected account not found.');
			return;
		}
		const baseData:
			| PostScheduledTransactionWrapper['scheduled_transaction']
			| PutScheduledTransactionWrapper['scheduled_transaction'] = {
			payee_name: billFormData.payee_name || null,
			account_id: billFormData.account_id,
			amount: amountMilliunits,
			memo: billFormData.memo || null,
			frequency,
			date: billFormData.date,
			category_id: billFormData.category_id || null
		};

		// Published bill: update in YNAB
		if (existingBill.published) {
			const result = await updateBillInYNAB(budgetId, existingBill.id, baseData, isDemo);
			if (!result.success) {
				alert(result.error ?? 'Failed to update bill in YNAB.');
				return;
			}
			await db.scheduled_transactions.update(existingBill.id, {
				account_name: accountName,
				monthly_amount: computeMonthlyAmount(baseData.amount ?? 0, frequency),
				published: true,
				subtransactions: [...existingBill.subtransactions],
				budget_id: existingBill.budget_id,
				date_first: existingBill.date_first,
				date_next: baseData.date ?? existingBill.date_next,
				frequency: baseData.frequency ?? existingBill.frequency,
				account_id: baseData.account_id,
				amount: baseData.amount ?? existingBill.amount,
				memo: baseData.memo ?? existingBill.memo,
				payee_name: baseData.payee_name ?? existingBill.payee_name,
				deleted: existingBill.deleted,
				category_id: baseData.category_id ?? existingBill.category_id,
				category_name: getCategoryName(baseData.category_id ?? existingBill.category_id) || null
			});
			goto(resolve(`/plan/${budgetId}`));
			return;
		}

		// Draft: publish to YNAB
		if (shouldPublish) {
			const createResult = await createBillInYNAB(budgetId, baseData, isDemo);
			if (!createResult.success || !createResult.id) {
				alert(createResult.error ?? 'Failed to publish draft bill.');
				return;
			}
			const publishedBill: CustomScheduledTransactionDetail = {
				id: createResult.id,
				budget_id: budgetId,
				account_name: accountName,
				published: true,
				monthly_amount: computeMonthlyAmount(baseData.amount ?? 0, frequency),
				date_next: baseData.date ?? existingBill.date_next,
				date_first: existingBill.date_first,
				deleted: existingBill.deleted,
				frequency: baseData.frequency ?? existingBill.frequency,
				account_id: baseData.account_id,
				category_id: baseData.category_id ?? existingBill.category_id,
				category_name: getCategoryName(baseData.category_id ?? existingBill.category_id) || null,
				amount: baseData.amount ?? existingBill.amount,
				memo: baseData.memo ?? existingBill.memo,
				payee_name: baseData.payee_name ?? existingBill.payee_name,
				subtransactions: [...existingBill.subtransactions]
			};
			await db.scheduled_transactions.delete(existingBill.id);
			await db.scheduled_transactions.put(publishedBill);
			goto(resolve(`/plan/${budgetId}`));
			return;
		}

		// Draft: save locally only
		await db.scheduled_transactions.update(existingBill.id, {
			account_name: accountName,
			published: false,
			monthly_amount: computeMonthlyAmount(baseData.amount ?? 0, frequency),
			date_next: baseData.date ?? existingBill.date_next,
			budget_id: existingBill.budget_id,
			date_first: existingBill.date_first,
			frequency: baseData.frequency ?? existingBill.frequency,
			account_id: baseData.account_id,
			amount: baseData.amount ?? existingBill.amount,
			memo: baseData.memo ?? existingBill.memo,
			payee_name: baseData.payee_name ?? existingBill.payee_name,
			deleted: existingBill.deleted,
			subtransactions: [...existingBill.subtransactions],
			category_id: baseData.category_id ?? existingBill.category_id,
			category_name: getCategoryName(baseData.category_id ?? existingBill.category_id) || null
		});

		goto(resolve(`/plan/${budgetId}`));
	}
</script>

<svelte:head>
	<title>Edit Bill &mdash; {_budget?.name ?? 'Plan'} | Bills (For YNAB)</title>
</svelte:head>

<svelte:window
	onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && goto(resolve(`/plan/${budgetId}`))}
/>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
	{#if budgetId && billId}
		<div>
			<Breadcrumb items={[
				{ label: 'Home', href: resolve('/') },
				{ label: 'Plans', href: resolve('/plans') },
				{ label: _budget?.name ?? 'Plan', href: resolve(`/plan/${budgetId}`) },
				{ label: 'Edit Bill' }
			]} />
			<h1 class="mt-2 text-lg font-medium text-stone-800 dark:text-stone-200">Edit Bill</h1>
		</div>

		{#if !existingBill}
			<p class="text-sm text-stone-500 dark:text-stone-400">Loading bill…</p>
		{:else if !effectiveWriteAccess}
			<div
				class="rounded-lg border border-stone-200 bg-stone-100 p-4 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300"
			>
				<p class="font-medium">You need write access to edit bills.</p>
				<p class="mt-1">Use "Login with YNAB (Read and Write)" to enable this feature.</p>
				{#if isDemo}
					<p class="mt-2">
						In demo mode, switch the access type to "Read & Write" in the banner above.
					</p>
					<button
						type="button"
						class="mt-3 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
						onclick={fetchData}
						disabled={fetchingData}
					>
						{fetchingData ? 'Fetching…' : 'Fetch Data'}
					</button>
				{/if}
			</div>
		{:else}
			<form class="flex flex-col gap-4" onsubmit={(e: Event) => e.preventDefault()}>
				<div class="grid grid-cols-1 gap-3">
					<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
						Account*
						<select
							bind:value={billFormData.account_id}
							required
							class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
						>
							<option value="">Select account</option>
							{#each groupedByTypeAvailableAccounts as accountGroup (accountGroup)}
								<optgroup label={parseAccountType(accountGroup) ?? 'Other'}>
									{#each availableAccounts.filter((a) => a.type === accountGroup) as account (account.id)}
										<option value={account.id}>{account.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
						Date*
						<input
							type="date"
							bind:value={billFormData.date}
							min={minBillDate}
							max={maxBillDate}
							required
							class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
						Amount {_budget?.currency_format?.currency_symbol
							? `(in ${_budget.currency_format.iso_code})`
							: null}*
						<input
							type="number"
							step="0.01"
							min="0"
							bind:value={billFormData.amount}
							placeholder="75.00"
							class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
						Payee (optional)
						<input
							type="text"
							bind:value={billFormData.payee_name}
							placeholder="Payee name"
							class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
						Category (optional)
						<select
							bind:value={billFormData.category_id}
							class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
						>
							<option value="">Select category</option>
							{#each $categoryGroups ?? [] as group (group.id)}
								<optgroup label={group.name}>
									{#each group.categories as category (category.id)}
										<option value={category.id}>{category.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
						Memo (optional)
						<input
							type="text"
							bind:value={billFormData.memo}
							placeholder="Notes"
							class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
						/>
					</label>
					{#if unsupportedFrequencyLock}
						<p class="text-sm text-stone-600 dark:text-stone-400">
							Frequency: {parseFrequencyText(billFormData.frequency)}
						</p>
					{:else}
						<label class="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
							Frequency
							<select
								bind:value={billFormData.frequency}
								class="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
							>
								{#each supportedFrequencies as frequency (frequency)}
									<option value={frequency}>{parseFrequencyText(frequency)}</option>
								{/each}
							</select>
							<small
								class="mt-1 cursor-help text-stone-600 dark:text-stone-400"
								data-tooltip="Note: Due to a bug with YNAB's API, some frequencies may not be editable when updating an existing bill. These include: {unsupportedFrequencies.join(
									', '
								)}.">What about other frequencies?</small
							>
						</label>
					{/if}
				</div>
				{#if unsupportedFrequencyLock}
					<div class="space-y-1 text-sm text-stone-600 dark:text-stone-400">
						<p class="font-medium">Why can't I update this bill?</p>
						<p>
							Due to a bug with YNAB's API, it's not possible to update a bill with a frequency
							within the following list: {unsupportedFrequencies.join(', ')}.
						</p>
						<p>
							We apologize for the inconvenience and are working with YNAB's API team to resolve
							this.
						</p>
					</div>
				{/if}
				<div class="flex justify-end gap-3 pt-2">
					<a
						href={resolve(`/plan/${budgetId}`)}
						class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700/50"
					>
						Cancel
					</a>
					{#if existingBill.published}
						<button
							type="button"
							class="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
							onclick={() => handleSaveBill(true)}
							disabled={unsupportedFrequencyLock}
							data-tooltip="Update this bill in your YNAB budget."
						>
							Save
						</button>
					{:else}
						<button
							type="button"
							class="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700/50"
							onclick={() => handleSaveBill(false)}
							disabled={unsupportedFrequencyLock}
							data-tooltip="Save the bill only in this app. It won't be sent to YNAB until you publish it from the plan page."
						>
							Save Draft
						</button>
						<button
							type="button"
							class="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
							onclick={() => handleSaveBill(true)}
							disabled={unsupportedFrequencyLock}
							data-tooltip="Save the bill and sync it to your YNAB budget right away."
						>
							Save & Publish
						</button>
					{/if}
				</div>
			</form>
		{/if}
	{/if}
</div>
