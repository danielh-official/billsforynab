// place files you want to import through the `$lib` alias in this folder.

import type {
	PostScheduledTransactionWrapper,
	PutScheduledTransactionWrapper,
	ScheduledTransactionFrequency
} from 'ynab';
import {
	db,
	type CustomCategoryGroupWithCategories,
	type CustomScheduledTransactionDetail
} from '$lib/db';
import { SvelteDate } from 'svelte/reactivity';

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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
			published: true,
			subtransactions: []
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
		]
	});
}
