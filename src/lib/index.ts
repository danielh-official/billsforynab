// place files you want to import through the `$lib` alias in this folder.

import type {
	BudgetDetail,
	BudgetSummaryResponse,
	PostScheduledTransactionWrapper,
	PutScheduledTransactionWrapper,
	ScheduledTransactionFrequency,
	TransactionDetail
} from 'ynab/dist/models';
import {
	db,
	type CustomBudgetDetail,
	type CustomCategoryGroupWithCategories,
	type CustomScheduledTransactionDetail
} from '$lib/db';
import { SvelteDate, SvelteMap } from 'svelte/reactivity';

export async function fetchBudgets(
	accessToken: string
): Promise<{ success: boolean; error?: string }> {
	const budgetsResponse = await fetch('https://api.ynab.com/v1/budgets?include_accounts=true', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (budgetsResponse.status === 401) {
		sessionStorage.removeItem('ynab_access_token');
		return { success: false, error: 'Unauthorized. Please login again.' };
	}

	if (!budgetsResponse.ok) {
		return { success: false, error: `Failed to fetch budgets: ${budgetsResponse.statusText}` };
	}

	const budgetsData: BudgetSummaryResponse = await budgetsResponse.json();
	const defaultBudgetId = budgetsData.data.default_budget?.id;
	const budgets = budgetsData.data.budgets.map((b: BudgetDetail) => ({
		...b,
		is_default: b.id === defaultBudgetId
	}));
	db.budgets.bulkPut(budgets);

	return { success: true };
}

export async function updateBillInYNAB(
	budgetId: string,
	billId: string,
	billData: PutScheduledTransactionWrapper['scheduled_transaction'],
	dummy: boolean = false
): Promise<{ success: boolean; error?: string }> {
	if (dummy) {
		return { success: true };
	}

	const accessToken = sessionStorage.getItem('ynab_access_token');
	if (!accessToken) {
		return { success: false, error: 'No access token found' };
	}

	const payload: PutScheduledTransactionWrapper = {
		scheduled_transaction: {
			account_id: billData.account_id,
			payee_name: billData.payee_name || null,
			frequency: parseFrequency(billData.frequency),
			amount: billData.amount,
			memo: billData.memo || null,
			date: billData.date,
			category_id: billData.category_id || null
		}
	};

	try {
		const response = await fetch(
			`https://api.ynab.com/v1/budgets/${budgetId}/scheduled_transactions/${billId}`,
			{
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			}
		);

		if (response.status === 401) {
			sessionStorage.removeItem('ynab_access_token');
			return { success: false, error: 'Unauthorized. Please login again.' };
		}

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Failed to update bill in YNAB:', errorData);
			return { success: false, error: `Failed to update bill: ${response.statusText}` };
		}

		return { success: true };
	} catch (error) {
		console.error('Error updating bill in YNAB:', error);
		return { success: false, error: 'Network error updating bill' };
	}
}

export const supportedFrequencies: ScheduledTransactionFrequency[] = [
	'daily',
	'weekly',
	'monthly',
	'yearly'
];

export const unsupportedFrequencies: ScheduledTransactionFrequency[] = [
	'everyOtherWeek',
	'twiceAMonth',
	'every4Weeks',
	'everyOtherMonth',
	'every3Months',
	'every4Months',
	'twiceAYear'
];

/**
 * This is to parse out any frequencies that don't currently work with YNAB API (e.g., every3Months)
 */
function parseFrequency(
	frequency: ScheduledTransactionFrequency | undefined
): ScheduledTransactionFrequency | undefined {
	if (frequency && unsupportedFrequencies.includes(frequency)) {
		return undefined;
	}
	return frequency;
}

export async function createBillInYNAB(
	budgetId: string,
	billData: PostScheduledTransactionWrapper['scheduled_transaction'],
	dummy: boolean = false
): Promise<{ success: boolean; id?: string; error?: string }> {
	if (dummy) {
		return { success: true, id: crypto.randomUUID() };
	}

	const accessToken = sessionStorage.getItem('ynab_access_token');
	if (!accessToken) {
		return { success: false, error: 'No access token found' };
	}

	// Prepare payload for YNAB API
	const payload: PostScheduledTransactionWrapper = {
		scheduled_transaction: {
			account_id: billData.account_id,
			payee_name: billData.payee_name || null,
			frequency: parseFrequency(billData.frequency),
			amount: billData.amount,
			memo: billData.memo || null,
			date: billData.date,
			category_id: billData.category_id || null
		}
	};

	try {
		const response = await fetch(
			`https://api.ynab.com/v1/budgets/${budgetId}/scheduled_transactions`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			}
		);

		if (response.status === 401) {
			sessionStorage.removeItem('ynab_access_token');
			return { success: false, error: 'Unauthorized. Please login again.' };
		}

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Failed to create bill in YNAB:', errorData);
			return { success: false, error: `Failed to create bill: ${response.statusText}` };
		}

		const responseData = await response.json();
		const newId = responseData.data.scheduled_transaction.id;

		return { success: true, id: newId };
	} catch (error) {
		console.error('Error creating bill in YNAB:', error);
		return { success: false, error: 'Network error creating bill' };
	}
}

export async function deleteBillInYNAB(
	budgetId: string,
	billId: string,
	dummy: boolean = false
): Promise<{ success: boolean; error?: string }> {
	if (dummy) {
		return { success: true };
	}

	const accessToken = sessionStorage.getItem('ynab_access_token');
	if (!accessToken) {
		return { success: false, error: 'No access token found' };
	}

	try {
		const response = await fetch(
			`https://api.ynab.com/v1/budgets/${budgetId}/scheduled_transactions/${billId}`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		if (response.status === 401) {
			sessionStorage.removeItem('ynab_access_token');
			return { success: false, error: 'Unauthorized. Please login again.' };
		}

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Failed to delete bill in YNAB:', errorData);
			return { success: false, error: `Failed to delete bill: ${response.statusText}` };
		}

		return { success: true };
	} catch (error) {
		console.error('Error deleting bill in YNAB:', error);
		return { success: false, error: 'Network error deleting bill' };
	}
}

export async function createFakeDataForDemo() {
	const utilitiesGroupId = 'demo-group-1';
	const entertainmentGroupId = 'demo-group-2';
	const healthFitnessGroupId = 'demo-group-3';
	const foodDrinksGroupId = 'demo-group-4';
	const autoTransportGroupId = 'demo-group-5';
	const creditCardGroupId = 'demo-group-6';

	const utilitiesGroupName = 'Utilities';
	const entertainmentGroupName = 'Entertainment';
	const healthFitnessGroupName = 'Health & Fitness';
	const foodDrinksGroupName = 'Food & Drinks';
	const autoTransportGroupName = 'Auto & Transport';
	const creditCardGroupName = 'Credit Card';

	const electricityCategory = {
		id: 'demo-category-1',
		name: 'Electricity',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: utilitiesGroupId,
		category_group_name: utilitiesGroupName,
		hidden: false,
		note: null
	};

	const waterCategory = {
		id: 'demo-category-2',
		name: 'Water',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: utilitiesGroupId,
		category_group_name: utilitiesGroupName,
		hidden: false,
		note: null
	};

	const streamServicesCategory = {
		id: 'demo-category-3',
		name: 'Streaming Services',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: entertainmentGroupId,
		category_group_name: entertainmentGroupName,
		hidden: false,
		note: null
	};

	const moviesAndEventsCategory = {
		id: 'demo-category-4',
		name: 'Movies & Events',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: entertainmentGroupId,
		category_group_name: entertainmentGroupName,
		hidden: false,
		note: null
	};

	const gymMembershipCategory = {
		id: 'demo-category-5',
		name: 'Gym Memberships',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: healthFitnessGroupId,
		category_group_name: healthFitnessGroupName,
		hidden: false,
		note: null
	};

	const diningOutCategory = {
		id: 'demo-category-6',
		name: 'Dining Out',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: foodDrinksGroupId,
		category_group_name: foodDrinksGroupName,
		hidden: false,
		note: null
	};

	const groceriesCategory = {
		id: 'demo-category-7',
		name: 'Groceries',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: foodDrinksGroupId,
		category_group_name: foodDrinksGroupName,
		hidden: false,
		note: null
	};

	const fuelCategory = {
		id: 'demo-category-8',
		name: 'Fuel',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: autoTransportGroupId,
		category_group_name: autoTransportGroupName,
		hidden: false,
		note: null
	};

	const carInsuranceCategory = {
		id: 'demo-category-9',
		name: 'Car Insurance',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: autoTransportGroupId,
		category_group_name: autoTransportGroupName,
		hidden: false,
		note: null
	};

	const creditCardCategory = {
		id: 'demo-category-10',
		name: 'Credit Card',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: creditCardGroupId,
		category_group_name: creditCardGroupName,
		hidden: false,
		note: null
	};

	const carRegistrationCategory = {
		id: 'demo-category-11',
		name: 'Car Registration',
		deleted: false,
		activity: 0,
		balance: 0,
		budgeted: 0,
		category_group_id: autoTransportGroupId,
		category_group_name: autoTransportGroupName,
		hidden: false,
		note: null
	};

	const fakeCategoryGroups: CustomCategoryGroupWithCategories[] = [
		{
			budget_id: 'demo',
			id: 'demo-group-1',
			deleted: false,
			name: 'Utilities',
			hidden: false,
			categories: [electricityCategory, waterCategory]
		},
		{
			budget_id: 'demo',
			id: 'demo-group-2',
			deleted: false,
			name: 'Entertainment',
			hidden: false,
			categories: [streamServicesCategory, moviesAndEventsCategory]
		},
		{
			budget_id: 'demo',
			id: 'demo-group-3',
			deleted: false,
			name: 'Health & Fitness',
			hidden: false,
			categories: [gymMembershipCategory]
		},
		{
			budget_id: 'demo',
			id: 'demo-group-4',
			deleted: false,
			name: 'Food & Drinks',
			hidden: false,
			categories: [diningOutCategory, groceriesCategory]
		},
		{
			budget_id: 'demo',
			id: 'demo-group-5',
			deleted: false,
			name: 'Auto & Transport',
			hidden: false,
			categories: [fuelCategory, carInsuranceCategory, carRegistrationCategory]
		},
		{
			budget_id: 'demo',
			id: 'demo-group-6',
			deleted: false,
			name: 'Credit Card',
			hidden: false,
			categories: [creditCardCategory]
		}
	];

	await db.category_groups.bulkPut(fakeCategoryGroups);

	const fakeBills: CustomScheduledTransactionDetail[] = [
		{
			id: 'demo-bill-1',
			budget_id: 'demo',
			payee_name: 'Electric Company',
			category_name: electricityCategory.name,
			category_id: electricityCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-1',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 25)).toISOString().slice(0, 10),
					amount: -75000,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Electric Company', category_id: electricityCategory.id,
					category_name: electricityCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		{
			id: 'demo-bill-2',
			budget_id: 'demo',
			payee_name: 'Water Company',
			category_name: waterCategory.name,
			category_id: waterCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-2',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 20)).toISOString().slice(0, 10),
					amount: -30000,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Water Company', category_id: waterCategory.id,
					category_name: waterCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		{
			id: 'demo-bill-3',
			budget_id: 'demo',
			payee_name: 'Spotify',
			category_name: streamServicesCategory.name,
			category_id: streamServicesCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-3',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 28)).toISOString().slice(0, 10),
					amount: -9990,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Spotify', category_id: streamServicesCategory.id,
					category_name: streamServicesCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		{
			id: 'demo-bill-4',
			budget_id: 'demo',
			payee_name: 'Netflix',
			category_name: streamServicesCategory.name,
			category_id: streamServicesCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-4',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 15)).toISOString().slice(0, 10),
					amount: -15900,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Netflix', category_id: streamServicesCategory.id,
					category_name: streamServicesCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		{
			id: 'demo-bill-5',
			budget_id: 'demo',
			payee_name: 'Gym Membership',
			category_name: gymMembershipCategory.name,
			category_id: gymMembershipCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-5',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 10)).toISOString().slice(0, 10),
					amount: -45000,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Gym Membership', category_id: gymMembershipCategory.id,
					category_name: gymMembershipCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		{
			id: 'demo-bill-6',
			budget_id: 'demo',
			payee_name: 'Car Insurance',
			category_name: carInsuranceCategory.name,
			category_id: carInsuranceCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-6',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 35)).toISOString().slice(0, 10),
					amount: -120000,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Car Insurance', category_id: carInsuranceCategory.id,
					category_name: carInsuranceCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		{
			id: 'demo-bill-7',
			budget_id: 'demo',
			payee_name: 'Credit Card',
			category_name: creditCardCategory.name,
			category_id: creditCardCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-7',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 23)).toISOString().slice(0, 10),
					amount: -200000,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Credit Card', category_id: creditCardCategory.id,
					category_name: creditCardCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		},
		// yearly
		{
			id: 'demo-bill-8',
			budget_id: 'demo',
			payee_name: 'Car Registration',
			category_name: carRegistrationCategory.name,
			category_id: carRegistrationCategory.id,
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
			subtransactions: [],
			history: [
				{
					id: 'demo-tx-8',
					date: new SvelteDate(new SvelteDate().setDate(new SvelteDate().getDate() - 335)).toISOString().slice(0, 10),
					amount: -60000,
					memo: null, cleared: 'cleared', approved: true, flag_color: null, flag_name: null,
					account_id: 'demo-account-1', account_name: 'Checking Account',
					payee_id: null, payee_name: 'Car Registration', category_id: carRegistrationCategory.id,
					category_name: carRegistrationCategory.name, transfer_account_id: null,
					transfer_transaction_id: null, matched_transaction_id: null,
					import_id: null, import_payee_name: null, import_payee_name_original: null,
					debt_transaction_type: null, deleted: false, subtransactions: []
				}
			]
		}
	];

	await db.scheduled_transactions.bulkPut(fakeBills);

	await db.budgets.update('demo', {
		accounts: [
			{
				id: 'demo-account-1',
				name: 'Checking Account',
				type: 'checking',
				on_budget: true,
				closed: false,
				deleted: false,
				balance: 5000000, // $5,000.00
				cleared_balance: 5000000,
				uncleared_balance: 0,
				transfer_payee_id: null
			},
			{
				id: 'demo-account-2',
				name: 'Savings Account',
				type: 'savings',
				on_budget: true,
				closed: false,
				deleted: false,
				balance: 10000000, // $10,000.00
				cleared_balance: 10000000,
				uncleared_balance: 0,
				transfer_payee_id: null
			},
			{
				id: 'demo-account-3',
				name: 'Credit Card',
				type: 'creditCard',
				on_budget: true,
				closed: false,
				deleted: false,
				balance: -200000, // -$2,000.00
				cleared_balance: -200000,
				uncleared_balance: 0,
				transfer_payee_id: null
			}
		],
		last_fetched: new Date()
	});
}

export function determineAmountStringFromBudgetCurrency(
	amount: number,
	currentBudget: CustomBudgetDetail | undefined
): string | undefined {
	if (!currentBudget) {
		return undefined;
	}

	const budgetCurrency = currentBudget?.currency_format?.iso_code || 'USD';
	const formatter = new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: budgetCurrency
	});
	return formatter.format(amount / 1000);
}

export function frequencyToDays(frequency: string): number | null {
	switch (frequency) {
		case 'daily':
			return 1;
		case 'weekly':
			return 7;
		case 'everyOtherWeek':
			return 14;
		case 'twiceAMonth':
			return 15;
		case 'monthly':
			return 30;
		case 'everyOtherMonth':
			return 60;
		case 'every3Months':
			return 90;
		case 'every4Months':
			return 120;
		case 'twiceAYear':
			return 182;
		case 'yearly':
			return 365;
		case 'everyOtherYear':
			return 730;
		default:
			return null;
	}
}

export function getActivityStatus(
	bill: CustomScheduledTransactionDetail,
	latestDateStr: string
): { label: string; active: boolean } | null {
	const freqDays = frequencyToDays(bill.frequency as string);
	if (freqDays === null) return null;
	const daysSince = Math.floor(
		(new Date().getTime() - new Date(latestDateStr).getTime()) / (1000 * 60 * 60 * 24)
	);
	const active = daysSince <= freqDays * 2;
	return { label: active ? 'likely active' : 'likely inactive', active };
}

export function getFrequencyMultiplier(frequency: ScheduledTransactionFrequency) {
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

export function assignHistoricalTransactionsToScheduledTransactions(
	fetchedTransactions: TransactionDetail[],
	existingScheduledTransactions: CustomScheduledTransactionDetail[]
) {
	// Build a map of scheduled transaction id → history entries keyed by transaction id
	const historyMap = new SvelteMap<string, Map<string, TransactionDetail>>();
	for (const st of existingScheduledTransactions) {
		const byId = new SvelteMap<string, TransactionDetail>();
		for (const t of st.history ?? []) {
			byId.set(t.id, t);
		}
		historyMap.set(st.id, byId);
	}

	// Match each fetched transaction to all scheduled transactions it corresponds to and merge into
	// history. A split transaction can match multiple scheduled transactions via its subtransactions.
	for (const transaction of fetchedTransactions) {
		const matches = existingScheduledTransactions.filter((st) => {
			// Check top-level payee (only return true on a positive match; a payee_id mismatch
			// does NOT block the subtransaction fallback below)
			if (st.payee_id && transaction.payee_id && st.payee_id === transaction.payee_id) {
				return true;
			}
			if (st.payee_name != null && st.payee_name === transaction.payee_name) {
				return true;
			}
			// Fall through to subtransactions (split transactions)
			return (
				transaction.subtransactions?.some((sub) => {
					if (st.payee_id && sub.payee_id) {
						return st.payee_id === sub.payee_id;
					}
					return st.payee_name != null && st.payee_name === sub.payee_name;
				}) ?? false
			);
		});

		for (const match of matches) {
			const byId = historyMap.get(match.id)!;
			if (transaction.deleted) {
				byId.delete(transaction.id);
			} else {
				byId.set(transaction.id, transaction);
			}
		}
	}

	// Write merged history back to scheduled transactions
	const updatedWithHistory: CustomScheduledTransactionDetail[] = existingScheduledTransactions.map(
		(st) => ({
			...st,
			history: Array.from(historyMap.get(st.id)?.values() ?? [])
		})
	);

	return updatedWithHistory;
}
