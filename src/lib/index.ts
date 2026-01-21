// place files you want to import through the `$lib` alias in this folder.

import type {
	PostScheduledTransactionWrapper,
	PutScheduledTransactionWrapper,
	ScheduledTransactionFrequency
} from 'ynab';

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
			date: billData.date
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

	// Prepare payload for YNAB API - convert amount from milliunits to milliunits if needed
	const payload: PostScheduledTransactionWrapper = {
		scheduled_transaction: {
			account_id: billData.account_id,
			payee_name: billData.payee_name || null,
			frequency: parseFrequency(billData.frequency),
			amount: billData.amount,
			memo: billData.memo || null,
			date: billData.date
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
