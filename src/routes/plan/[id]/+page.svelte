<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { liveQuery } from 'dexie';
	import {
		ScheduledTransactionFrequency,
		type ScheduledTransactionDetail,
		type Account,
		type PutScheduledTransactionWrapper,
		type PostScheduledTransactionWrapper,
		AccountType,
		type ScheduledTransactionsResponse,
		type CategoriesResponse,
		type Category
	} from 'ynab/dist/models';
	import { db } from '$lib/db';
	import { resolve } from '$app/paths';
	import type {
		CustomCategoryGroupWithCategories,
		CustomScheduledTransactionDetail
	} from '$lib/db';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import Toast from '$lib/components/Toast.svelte';
	import {
		createBillInYNAB,
		createFakeDataForDemo,
		deleteBillInYNAB,
		supportedFrequencies,
		unsupportedFrequencies,
		updateBillInYNAB
	} from '$lib';
	import { browser } from '$app/environment';

	// MARK: - Mount and budgetId extraction

	let budgetId = $state<string | null>(null);

	const isDemo = $derived.by(() => {
		return page.params.id === 'demo';
	});

	let allowsBothReadAndWriteAccess: boolean = $state(false);

	$effect(() => {
		if (!browser) return;

		const ynabTokenWrite = sessionStorage.getItem('ynab_token_write');
		allowsBothReadAndWriteAccess = ynabTokenWrite === 'true';
	});

	$effect(() => {
		if (!browser) return;

		const id = page.params.id;

		if (!id) {
			goto(resolve('/'));
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

	let groupedByTypeAvailableAccounts = $derived.by(() => {
		const typesSet = new SvelteSet<AccountType>();
		availableAccounts.forEach((account) => {
			if (account.type) {
				typesSet.add(account.type);
			}
		});
		return Array.from(typesSet).sort((a, b) => a.localeCompare(b));
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
			case 'mortgage':
				return 'Mortgage';
			case 'autoLoan':
				return 'Auto Loan';
			case 'studentLoan':
				return 'Student Loan';
			case 'personalLoan':
				return 'Personal Loan';
			case 'medicalDebt':
				return 'Medical Debt';
			case 'otherDebt':
				return 'Other Debt';
			default:
				return 'Other';
		}
	}

	// MARK: - Fetching scheduled transactions for budget

	let fetchingData = $state(false);
	let toastVisible = $state(false);
	let toastMessage = $state('');
	let toastType: 'success' | 'error' | 'info' = $state('info');

	// MARK: - Bill creation/editing modal state

	let showBillModal = $state(false);
	let editingBillId = $state<string | null>(null);
	let billFormData = $state({
		payee_name: '',
		account_id: '',
		date: '',
		amount: 0,
		memo: '',
		frequency: 'monthly' as ScheduledTransactionFrequency,
		published: false,
		category_id: ''
	});

	function openBillModal(bill?: CustomScheduledTransactionDetail) {
		if (bill) {
			// Pre-fill modal with existing bill data for editing
			editingBillId = bill.id;
			billFormData = {
				payee_name: bill.payee_name || '',
				account_id: bill.account_id,
				date: bill.date_next.split('T')[0],
				amount: Math.abs(bill.amount) / 1000,
				memo: bill.memo || '',
				frequency: bill.frequency as ScheduledTransactionFrequency,
				published: bill.published ?? false,
				category_id: bill.category_id || ''
			};
		} else {
			// Reset for new bill creation
			editingBillId = null;
			billFormData = {
				payee_name: '',
				account_id: '',
				date: new Date().toISOString().split('T')[0],
				amount: 0,
				memo: '',
				frequency: 'monthly',
				published: false,
				category_id: ''
			};
		}
		showBillModal = true;
	}

	function closeBillModal() {
		showBillModal = false;
		editingBillId = null;
		billFormData = {
			payee_name: '',
			account_id: '',
			date: '',
			amount: 0,
			memo: '',
			frequency: 'monthly',
			published: false,
			category_id: ''
		};
	}

	// MARK: - Fetch data for budget

	async function fetchData() {
		fetchingData = true;

		if (!budgetId) {
			console.error('Budget ID is missing.');
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
			$currentBudget?.server_knowledge?.scheduled_transactions;

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
				toastMessage = 'Unauthorized. Please login again at the home page.';
			} else {
				toastMessage = `Failed to fetch data: ${scheduledTransactionsFetch.statusText}`;
			}

			toastType = 'error';
			toastVisible = true;
			fetchingData = false;
			return;
		}

		const scheduledTransactionsResponseJson: ScheduledTransactionsResponse =
			await scheduledTransactionsFetch.json();

		const scheduledTransactions: CustomScheduledTransactionDetail[] =
			scheduledTransactionsResponseJson.data.scheduled_transactions.map(
				(scheduledTransaction: ScheduledTransactionDetail) => ({
					...scheduledTransaction,
					budget_id: budgetId!,
					published: true,
					monthly_amount:
						scheduledTransaction.amount *
						getFrequencyMultiplier(scheduledTransaction.frequency as ScheduledTransactionFrequency)
				})
			);

		const newScheduledTransactionsServerKnowledge =
			scheduledTransactionsResponseJson.data.server_knowledge;

		const existingCategoriesServerKnowledge =
			$currentBudget?.server_knowledge?.category_groups || 0;

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
			$currentBudget?.server_knowledge?.category_groups || 0;

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
				toastMessage = 'Unauthorized. Please login again at the home page.';
			} else {
				toastMessage = `Failed to fetch categories: ${categoriesFetch.statusText}`;
			}
			toastType = 'error';
			toastVisible = true;
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
				budget_id: budgetId!
			}));

		// Bulk put category groups with categories
		await db.category_groups.bulkPut(categoryGroupWithCategories);

		fetchingData = false;
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
				'Are you sure you want to reset the data for this plan? This action cannot be undone.'
			)
		) {
			return;
		}

		resettingData = true;

		db.transaction('rw', db.budgets, db.scheduled_transactions, db.category_groups, async () => {
			await db.scheduled_transactions.where('budget_id').equals(budgetIdValue).delete();
			await db.category_groups.where('budget_id').equals(budgetIdValue).delete();
			await db.budgets.update(budgetIdValue, {
				server_knowledge: {
					scheduled_transactions: 0,
					category_groups: 0
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

	// MARK: - Sorting options with localStorage persistence

	let sortBy = $state('date_next');
	let sortDirection = $state('asc');

	// MARK: - Loading state for async bill operations

	let billsBeingSynced = new SvelteSet<string>();

	// MARK: - Date validation constraints (YNAB API requires date within 1 week ago to 5 years in future)

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

	$effect(() => {
		if (!browser) return;

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
		if (!browser) return;
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem('sort_by', sortBy);
		localStorage.setItem('sort_direction', sortDirection);
	});

	// MARK: - Bills list with live updates from IndexedDB

	let rawBills = liveQuery(() =>
		db.scheduled_transactions
			.where('budget_id')
			.equals(budgetId!)
			.and((transaction) => !transaction.deleted && transaction.amount < 0)
			.toArray()
	);

	// Sort transactions reactively based on sortBy and sortDirection
	let bills = $derived.by(() => {
		const transactions = $rawBills;
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
		const budgetCurrency = $currentBudget?.currency_format?.iso_code || 'USD';
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

	// MARK: - Compute monthly equivalent

	function computeMonthlyAmount(
		amountMilliunits: number,
		frequency: ScheduledTransactionFrequency
	) {
		return amountMilliunits * getFrequencyMultiplier(frequency);
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
		const transactions = $rawBills;
		if (!transactions) return 0;

		// Filter out excluded bills
		const includedTransactions = transactions.filter((t) => !t.excluded);

		// Reduce bills to monthly based on frequency (e.g., weekly bills are multiplied by 4, yearly bills are divided by 12, etc.) and sum them up
		return includedTransactions.reduce((total, transaction) => {
			return total + transaction.amount * getFrequencyMultiplier(transaction.frequency);
		}, 0);
	});

	// MARK: - Local helpers for syncing and toasts

	function setBillSyncing(billId: string, syncing: boolean) {
		if (syncing) {
			billsBeingSynced.add(billId);
		} else {
			billsBeingSynced.delete(billId);
		}
	}

	// MARK: - Toast display

	function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
		toastMessage = message;
		toastType = type;
		toastVisible = true;
	}

	// MARK: - Get account name by ID

	function getAccountName(accountId: string | undefined | null) {
		if (!accountId) return undefined;
		return availableAccounts.find((a: Account) => a.id === accountId)?.name;
	}

	// MARK: - Find category by id
	function getCategoryName(categoryId: string | undefined | null) {
		if (!categoryId || !budgetId) return undefined;
		for (const group of $categoryGroups.filter((g) => g.budget_id === budgetId)) {
			const category = group.categories.find((c) => c.id === categoryId);
			if (category) {
				return category.name;
			}
		}
		return undefined;
	}

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

	// MARK: - Bill creation / update / delete handlers

	async function handleSaveBill(shouldPublish: boolean) {
		if (!budgetId) {
			showToast('Budget ID is missing.', 'error');
			return;
		}

		if (!billFormData.account_id || !billFormData.date) {
			showToast('Account and date are required.', 'error');
			return;
		}

		// Validate date is within YNAB's allowed range (1 week ago to 5 years in future)
		const selectedDate = new SvelteDate(billFormData.date);
		const oneWeekAgo = new SvelteDate();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
		const fiveYearsFromNow = new SvelteDate();
		fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

		if (selectedDate < oneWeekAgo || selectedDate > fiveYearsFromNow) {
			showToast(
				'Date must not be more than 1 week in the past or over 5 years in the future.',
				'error'
			);
			return;
		}

		const amountMilliunits = -Math.abs(Math.round(Number(billFormData.amount || 0) * 1000));
		if (amountMilliunits === 0) {
			showToast('Amount must be greater than zero.', 'error');
			return;
		}

		const frequency = billFormData.frequency || 'monthly';
		const accountName = getAccountName(billFormData.account_id);

		if (!accountName) {
			showToast('Selected account not found.', 'error');
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

		// Editing existing bill
		if (editingBillId) {
			const existingBill = $rawBills.find((b) => b.id === editingBillId);
			if (!existingBill) {
				showToast('Bill not found.', 'error');
				return;
			}

			if (existingBill.published) {
				setBillSyncing(existingBill.id, true);
				const result = await updateBillInYNAB(budgetId, existingBill.id, baseData, isDemo);
				if (!result.success) {
					showToast(result.error ?? 'Failed to update bill in YNAB.', 'error');
					setBillSyncing(existingBill.id, false);
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
				setBillSyncing(existingBill.id, false);
				if (isDemo) {
					showToast('Bill updated in YNAB (not).', 'success');
				} else {
					showToast('Bill updated in YNAB.', 'success');
				}
				closeBillModal();
				return;
			}

			// Draft editing
			if (shouldPublish) {
				setBillSyncing(existingBill.id, true);
				const createResult = await createBillInYNAB(budgetId, baseData, isDemo);
				if (!createResult.success || !createResult.id) {
					showToast(createResult.error ?? 'Failed to publish draft bill.', 'error');
					setBillSyncing(existingBill.id, false);
					return;
				}

				const newId = createResult.id;
				const publishedBill: CustomScheduledTransactionDetail = {
					id: newId,
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
				setBillSyncing(existingBill.id, false);
				showToast('Draft published to YNAB.', 'success');
				closeBillModal();
				return;
			}

			// Save draft locally
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
			showToast('Draft saved locally.', 'success');
			closeBillModal();
			return;
		}

		// Creating new bill
		if (shouldPublish) {
			const tempId = crypto.randomUUID();
			setBillSyncing(tempId, true);
			const createResult = await createBillInYNAB(budgetId, baseData, isDemo);
			if (!createResult.success || !createResult.id) {
				showToast(createResult.error ?? 'Failed to create bill in YNAB.', 'error');
				setBillSyncing(tempId, false);
				return;
			}

			const newId = createResult.id;
			await db.scheduled_transactions.put({
				id: newId,
				budget_id: budgetId,
				account_name: accountName,
				published: true,
				monthly_amount: computeMonthlyAmount(baseData.amount ?? 0, frequency),
				date_first: baseData.date,
				date_next: baseData.date,
				deleted: false,
				subtransactions: [],
				frequency: baseData.frequency ?? 'monthly',
				account_id: baseData.account_id,
				amount: baseData.amount ?? 0,
				memo: baseData.memo ?? null,
				payee_name: baseData.payee_name ?? null,
				category_id: baseData.category_id || null,
				category_name: getCategoryName(baseData.category_id || null) || null
			});
			setBillSyncing(tempId, false);
			if (isDemo) {
				showToast('Bill created in YNAB (not).', 'success');
			} else {
				showToast('Bill created in YNAB.', 'success');
			}
			closeBillModal();
			return;
		}

		// Save new draft locally
		const draftId = crypto.randomUUID();
		await db.scheduled_transactions.put({
			id: draftId,
			budget_id: budgetId,
			account_name: accountName,
			published: false,
			monthly_amount: computeMonthlyAmount(baseData.amount ?? 0, frequency),
			date_first: baseData.date,
			date_next: baseData.date,
			deleted: false,
			subtransactions: [],
			frequency: baseData.frequency ?? 'monthly',
			account_id: baseData.account_id,
			amount: baseData.amount ?? 0,
			memo: baseData.memo ?? null,
			payee_name: baseData.payee_name ?? null,
			category_id: baseData.category_id || null,
			category_name: getCategoryName(baseData.category_id || null) || null
		});
		showToast('Draft saved locally.', 'success');
		closeBillModal();
	}

	// MARK: - Delete bill handler

	async function handleDeleteBill(bill: CustomScheduledTransactionDetail) {
		if (!budgetId) {
			showToast('Budget ID is missing.', 'error');
			return;
		}

		if (!bill) return;
		if (!bill.published) {
			await db.scheduled_transactions.delete(bill.id);
			showToast('Draft deleted.', 'success');
			return;
		}

		if (!confirm('Delete this bill in YNAB?')) return;
		setBillSyncing(bill.id, true);
		const result = await deleteBillInYNAB(budgetId, bill.id, isDemo);
		if (!result.success) {
			showToast(result.error ?? 'Failed to delete bill.', 'error');
			setBillSyncing(bill.id, false);
			return;
		}

		await db.scheduled_transactions.delete(bill.id);
		setBillSyncing(bill.id, false);
		if (isDemo) {
			showToast('Bill deleted in YNAB (not).', 'success');
		} else {
			showToast('Bill deleted in YNAB.', 'success');
		}
	}

	// MARK: - Publish draft bill to YNAB

	async function publishDraftBill(bill: CustomScheduledTransactionDetail) {
		if (!budgetId) {
			showToast('Budget ID is missing.', 'error');
			return;
		}
		if (!bill) return;
		if (!confirm('Publish this draft to YNAB?')) return;
		setBillSyncing(bill.id, true);

		const accountName = getAccountName(bill.account_id);

		if (!accountName) {
			showToast('Account for the bill not found.', 'error');
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
			showToast(result.error ?? 'Failed to publish draft bill.', 'error');
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
		showToast('Draft published to YNAB.', 'success');
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
</script>

<svelte:head>
	<title>Plan &mdash; {$currentBudget?.name} | Bills (For YNAB)</title>

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
		.bill.draft {
			border-style: dashed;
		}
		.bill.excluded {
			opacity: 0.5;
			background-color: #f5f5f5;
		}
		.bill-actions {
			display: flex;
			gap: 8px;
			justify-content: flex-end;
		}
		.toggle-exclude {
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
		.delete-bill-button {
			background: white;
			border: 1px solid #ccc;
			border-radius: 4px;
			padding: 4px 8px;
			cursor: pointer;
			font-size: 14px;
			transition: all 0.2s;
			color: #333;
		}
		.delete-bill-button:hover {
			background: #f0f0f0;
		}
		.edit-bill-button {
			background: white;
			border: 1px solid #ccc;
			border-radius: 4px;
			padding: 4px 8px;
			cursor: pointer;
			font-size: 14px;
			transition: all 0.2s;
			color: #333;
		}
		.edit-bill-button:hover {
			background: #f0f0f0;
		}
		.draft-badge {
			position: absolute;
			top: 8px;
			left: 8px;
			background: #f59e0b;
			color: white;
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 12px;
			font-weight: 600;
		}
		.bill-loading {
			position: absolute;
			top: 8px;
			right: 8px;
			background: #2563eb;
			color: white;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 12px;
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
		.create-bill-button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.modal-backdrop {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.35);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1000;
		}
		.modal {
			background: white;
			padding: 24px;
			border-radius: 12px;
			width: min(520px, 95vw);
			box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.form-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}
		.form-grid label {
			display: flex;
			flex-direction: column;
			gap: 4px;
			font-size: 14px;
			color: #333;
		}
		.form-grid input,
		.form-grid select {
			padding: 8px;
			border: 1px solid #ccc;
			border-radius: 6px;
			font-size: 14px;
		}
		.published-toggle {
			flex-direction: row !important;
			align-items: center;
			gap: 8px !important;
		}
		.modal-actions {
			display: flex;
			gap: 12px;
			justify-content: flex-end;
		}
		.modal-actions .primary {
			background: #2563eb;
			color: white;
			border: none;
			padding: 8px 14px;
			border-radius: 6px;
			cursor: pointer;
		}
		.modal-actions .secondary {
			background: white;
			border: 1px solid #ccc;
			padding: 8px 14px;
			border-radius: 6px;
			cursor: pointer;
			color: #333;
		}

		.modal-actions .primary:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.modal-actions .secondary:disabled {
			opacity: 0.5;
			cursor: not-allowed;
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
			.modal {
				background: #222;
			}
			.form-grid label {
				color: #eee;
			}
			.delete-bill-button {
				background: #222;
			}
			.delete-bill-button:hover {
				background: #333;
			}
			.edit-bill-button {
				background: #222;
			}
			.edit-bill-button:hover {
				background: #333;
			}
			.modal-actions .secondary {
				background: #222;
				border-color: #555;
				color: #eee;
			}
			.modal-actions .secondary:hover {
				background: #333;
			}
		}
	</style>
</svelte:head>

<!-- MARK: - Window Events -->

<svelte:window
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			closeBillModal();
		}
	}}
/>

<!-- MARK: - Toast -->
<Toast message={toastMessage} type={toastType} bind:visible={toastVisible} />

<!-- MARK: - Bill Modal -->
{#if showBillModal}
	<div class="modal-backdrop">
		<div class="modal">
			<h2>{editingBillId ? 'Edit Bill' : 'Create Bill'}</h2>
			<form
				onsubmit={(e: Event) => {
					e.preventDefault();
					handleSaveBill(billFormData.published);
				}}
			>
				<div class="form-grid">
					<label>
						Account*
						<select bind:value={billFormData.account_id} required>
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
					<label>
						Date*
						<input
							type="date"
							bind:value={billFormData.date}
							min={minBillDate}
							max={maxBillDate}
							required
						/>
					</label>
					<label>
						Amount {$currentBudget?.currency_format?.currency_symbol
							? `(in ${$currentBudget.currency_format.iso_code})`
							: null}*
						<input
							type="number"
							step="0.01"
							min="0"
							bind:value={billFormData.amount}
							placeholder="75.00"
						/>
					</label>
					<label>
						Payee (optional)
						<input type="text" bind:value={billFormData.payee_name} placeholder="Payee name" />
					</label>
					<label>
						Category (optional)
						<select bind:value={billFormData.category_id}>
							<option value="">Select category</option>
							{#each $categoryGroups as group (group.id)}
								<optgroup label={group.name}>
									{#each group.categories as category (category.id)}
										<option value={category.id}>{category.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<label>
						Memo (optional)
						<input type="text" bind:value={billFormData.memo} placeholder="Notes" />
					</label>
					{#if editingBillId && unsupportedFrequencies.includes(billFormData.frequency)}
						<p>Frequency: {parseFrequencyText(billFormData.frequency)}</p>
					{:else}
						<label>
							Frequency
							<select bind:value={billFormData.frequency}>
								{#each supportedFrequencies as frequency (frequency)}
									<option value={frequency}>{parseFrequencyText(frequency)}</option>
								{/each}
							</select>
							<div>
								<small
									style="cursor: help; margin-top: 0.5rem; color: #335d92;"
									data-tooltip="Note: Due to a bug with YNAB's API, some frequencies may not be editable when updating an existing bill. These include: {unsupportedFrequencies.join(
										', '
									)}.">What about other frequencies?</small
								>
							</div>
						</label>
					{/if}
					<label class="published-toggle">
						<input
							type="checkbox"
							bind:checked={billFormData.published}
							disabled={editingBillId !== null && billFormData.published}
						/>
						Published
					</label>
				</div>
				{#if !!editingBillId && unsupportedFrequencies.includes(billFormData.frequency)}
					<div>
						<p>Why can't I update this bill?</p>
						<p>
							Due to a bug with YNAB's API, it's not possible to update a bill with a frequency
							within the following list: {unsupportedFrequencies.join(', ')}.
						</p>
						<p>
							We apologize for the inconvenience, and we're working with YNAB's API team to get this
							matter sorted.
						</p>
					</div>
				{/if}
				<div class="modal-actions">
					<button type="button" class="secondary" onclick={closeBillModal}>Cancel</button>
					<button
						class="primary"
						disabled={!!editingBillId && unsupportedFrequencies.includes(billFormData.frequency)}
					>
						{billFormData.published ? 'Save & Publish' : 'Save Draft'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<main class="container">
	{#if budgetId}
		<!-- MARK: - Actions -->
		<div class="actions">
			<a href={resolve('/')}>Back to Plans</a>
			<button disabled={fetchingData} onclick={fetchData}>
				{fetchingData ? 'Fetching...' : 'Fetch Data'}
			</button>
			<button disabled={resettingData} onclick={resetDataForBudget}>
				{resettingData ? 'Resetting...' : 'Reset Data'}
			</button>
			{#if allowsBothReadAndWriteAccess}
				<button
					class="create-bill-button"
					disabled={!allowsBothReadAndWriteAccess}
					onclick={() => openBillModal()}
					data-tooltip={allowsBothReadAndWriteAccess
						? null
						: 'You need write access to create bills. Click "Login With YNAB (Read and Write)" on the home page to enable this feature.'}
				>
					Create Bill
				</button>
			{/if}
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
				{#if billsBeingSynced.has(bill.id)}
					<!-- loading state marker; no content change needed -->
				{/if}
				<div class="bill" class:excluded={bill.excluded} class:draft={!bill.published}>
					<div class="bill-actions">
						<!-- MARK: - Toggle Exclude/Include -->
						<button
							class="toggle-exclude"
							onclick={() => toggleExcluded(bill.id, bill.excluded ?? false)}
							data-tooltip={bill.excluded
								? 'Excluded from calculations'
								: 'Included in calculations'}
							aria-label={bill.excluded
								? `Include bill to ${bill.payee_name ?? 'unspecified payee'} of amount ${determineAmountStringFromBudgetCurrency(-bill.amount)} for frequency ${parseFrequencyText(bill.frequency)}`
								: `Exclude bill to ${bill.payee_name ?? 'unspecified payee'} of amount ${determineAmountStringFromBudgetCurrency(-bill.amount)} for frequency ${parseFrequencyText(bill.frequency)}`}
						>
							{bill.excluded ? '👁️' : '✓'}
						</button>
						<!-- MARK: - Edit/Delete/Publish Buttons -->
						{#if allowsBothReadAndWriteAccess}
							<button
								class="edit-bill-button"
								disabled={!allowsBothReadAndWriteAccess || billsBeingSynced.has(bill.id)}
								onclick={() => openBillModal(bill)}
								data-tooltip={allowsBothReadAndWriteAccess
									? 'Edit this bill'
									: 'You need write access to edit bills. Click "Login With YNAB (Read and Write)" on the home page to enable this feature.'}
								aria-label={`Edit bill to ${bill.payee_name ?? 'unspecified payee'} of amount ${determineAmountStringFromBudgetCurrency(-bill.amount)} for frequency ${parseFrequencyText(bill.frequency)}`}
							>
								✏️
							</button>
							<button
								class="delete-bill-button"
								disabled={!allowsBothReadAndWriteAccess ||
									billsBeingSynced.has(bill.id) ||
									unsupportedFrequencies.includes(bill.frequency)}
								onclick={() => handleDeleteBill(bill)}
								data-tooltip={allowsBothReadAndWriteAccess
									? unsupportedFrequencies.includes(bill.frequency)
										? `Cannot delete bills with frequency: ${unsupportedFrequencies.join(', ')} due to YNAB API limitations.`
										: 'Delete this bill'
									: 'You need write access to delete bills. Click "Login With YNAB (Read and Write)" on the home page to enable this feature.'}
								aria-label={`Delete bill to ${bill.payee_name ?? 'unspecified payee'} of amount ${determineAmountStringFromBudgetCurrency(-bill.amount)} for frequency ${parseFrequencyText(bill.frequency)}`}
							>
								🗑️
							</button>
							{#if !bill.published}
								<button
									class="publish-bill-button"
									disabled={!allowsBothReadAndWriteAccess || billsBeingSynced.has(bill.id)}
									onclick={() => publishDraftBill(bill)}
									data-tooltip={allowsBothReadAndWriteAccess
										? 'Bill is draft. Click to publish to YNAB.'
										: 'You need write access to publish bills. Click "Login With YNAB (Read and Write)" on the home page to enable this feature.'}
									aria-label={`Publish draft bill of ${bill.payee_name ?? 'unspecified payee'} of amount ${determineAmountStringFromBudgetCurrency(-bill.amount)} for frequency ${parseFrequencyText(bill.frequency)} to YNAB`}
								>
									🚀
								</button>
							{/if}
						{/if}
					</div>
					{#if !bill.published}
						<div class="draft-badge">DRAFT</div>
					{/if}
					{#if billsBeingSynced.has(bill.id)}
						<div class="bill-loading">Syncing with YNAB…</div>
					{/if}
					<!-- MARK: - Bill Details -->
					<ul>
						<li class="monthly-equivalent">
							Monthly Equivalent: {determineAmountStringFromBudgetCurrency(
								-(bill.monthly_amount ?? bill.amount * getFrequencyMultiplier(bill.frequency))
							)}
						</li>
						<li>
							<strong>
								Due: {convertToReadableDate(bill.date_next)} ({getRelativeDate(bill.date_next)})
							</strong>
						</li>
					</ul>
					<p>
						{determineAmountStringFromBudgetCurrency(-bill.amount)} ({parseFrequencyText(
							bill.frequency
						)}) to
						<strong>{bill.payee_name ?? 'unspecified payee'}</strong>
					</p>
					<ul>
						<li>
							Category: {bill.category_name}
							{#if getCategory(bill.category_id)}
								({getCategory(bill.category_id)?.category_group_name})
							{/if}
						</li>
						<li style="margin-top: 0.5em;">Account: {bill.account_name}</li>
						<li style="margin-top: 0.5em;">
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
