import { describe, it, expect, vi } from 'vitest';

// Mock browser-only dependencies so pure functions can be tested in Node
vi.mock('$lib/db', () => ({ db: {} }));
vi.mock('svelte/reactivity', () => ({ SvelteDate: Date, SvelteMap: Map }));

import {
	frequencyToDays,
	getActivityStatus,
	assignHistoricalTransactionsToScheduledTransactions
} from './index';
import type { TransactionDetail } from 'ynab/dist/models';
import type { CustomScheduledTransactionDetail } from '$lib/db';

// ---------------------------------------------------------------------------
// MARK: Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

function makeBill(frequency: string) {
	return { frequency } as Parameters<typeof getActivityStatus>[0];
}

// ---------------------------------------------------------------------------
// MARK: frequencyToDays
// ---------------------------------------------------------------------------

describe('frequencyToDays', () => {
	it.each([
		['daily', 1],
		['weekly', 7],
		['everyOtherWeek', 14],
		['twiceAMonth', 15],
		['monthly', 30],
		['everyOtherMonth', 60],
		['every3Months', 90],
		['every4Months', 120],
		['twiceAYear', 182],
		['yearly', 365],
		['everyOtherYear', 730]
	])('returns %i for "%s"', (frequency, expected) => {
		expect(frequencyToDays(frequency)).toBe(expected);
	});

	it('returns null for unknown frequency', () => {
		expect(frequencyToDays('never')).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(frequencyToDays('')).toBeNull();
	});

	it('returns null for arbitrary string', () => {
		expect(frequencyToDays('everyOtherCentury')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// MARK: getActivityStatus
// ---------------------------------------------------------------------------

describe('getActivityStatus', () => {
	describe('likely active', () => {
		it('returns likely active when paid within the frequency period', () => {
			const result = getActivityStatus(makeBill('monthly'), daysAgo(20));
			expect(result).toEqual({ label: 'likely active', active: true });
		});

		it('returns likely active exactly at the 2× threshold (boundary)', () => {
			// monthly = 30 days; 30 × 2 = 60 — paid exactly 60 days ago
			const result = getActivityStatus(makeBill('monthly'), daysAgo(60));
			expect(result).toEqual({ label: 'likely inactive', active: false });
		});

		it('returns likely active for weekly bill paid 13 days ago', () => {
			// weekly = 7 days; threshold = 14 — 13 days ≤ 14
			const result = getActivityStatus(makeBill('weekly'), daysAgo(13));
			expect(result).toEqual({ label: 'likely inactive', active: false });
		});

		it('returns likely active for yearly bill paid 400 days ago', () => {
			// yearly = 365 days; threshold = 730 — 400 ≤ 730
			const result = getActivityStatus(makeBill('yearly'), daysAgo(400));
			expect(result).toEqual({ label: 'likely active', active: true });
		});
	});

	describe('likely inactive', () => {
		it('returns likely inactive when paid beyond 2× the period', () => {
			// monthly = 30 days; threshold = 60 — 61 > 60
			const result = getActivityStatus(makeBill('monthly'), daysAgo(61));
			expect(result).toEqual({ label: 'likely inactive', active: false });
		});

		it('returns likely inactive for weekly bill paid 15 days ago', () => {
			// weekly threshold = 14 — 15 > 14
			const result = getActivityStatus(makeBill('weekly'), daysAgo(15));
			expect(result).toEqual({ label: 'likely inactive', active: false });
		});

		it('returns likely inactive for yearly bill paid over 2 years ago', () => {
			// yearly = 365 days; threshold = 730 — 731 > 730
			const result = getActivityStatus(makeBill('yearly'), daysAgo(731));
			expect(result).toEqual({ label: 'likely inactive', active: false });
		});

		it('returns likely inactive for every3Months bill paid 6 months ago', () => {
			// every3Months = 90 days; threshold = 180 — 181 > 180
			const result = getActivityStatus(makeBill('every3Months'), daysAgo(181));
			expect(result).toEqual({ label: 'likely inactive', active: false });
		});
	});

	describe('unknown / unsupported frequency', () => {
		it('returns null for "never" frequency', () => {
			expect(getActivityStatus(makeBill('never'), daysAgo(1))).toBeNull();
		});

		it('returns null for an unrecognised frequency string', () => {
			expect(getActivityStatus(makeBill('fortnightly'), daysAgo(1))).toBeNull();
		});

		it('returns null for empty frequency string', () => {
			expect(getActivityStatus(makeBill(''), daysAgo(1))).toBeNull();
		});
	});
});

// ---------------------------------------------------------------------------
// MARK: assignHistoricalTransactionsToScheduledTransactions
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<TransactionDetail> & { id: string }): TransactionDetail {
	return {
		date: '2025-01-15',
		amount: -50000,
		memo: null,
		cleared: 'cleared',
		approved: true,
		flag_color: null,
		flag_name: null,
		account_id: 'account-1',
		account_name: 'Checking',
		payee_id: null,
		payee_name: null,
		category_id: null,
		category_name: null,
		transfer_account_id: null,
		transfer_transaction_id: null,
		matched_transaction_id: null,
		import_id: null,
		import_payee_name: null,
		import_payee_name_original: null,
		debt_transaction_type: null,
		deleted: false,
		subtransactions: [],
		...overrides
	} as TransactionDetail;
}

function makeST(
	overrides: Partial<CustomScheduledTransactionDetail> & { id: string }
): CustomScheduledTransactionDetail {
	return {
		budget_id: 'budget-1',
		payee_id: null,
		payee_name: null,
		frequency: 'monthly',
		date_next: '2025-02-01',
		date_first: '2024-01-01',
		amount: -50000,
		memo: null,
		account_id: 'account-1',
		account_name: 'Checking',
		category_id: null,
		category_name: null,
		transfer_account_id: null,
		deleted: false,
		subtransactions: [],
		history: [],
		...overrides
	} as CustomScheduledTransactionDetail;
}

describe('assignHistoricalTransactionsToScheduledTransactions', () => {
	describe('matching by payee_id', () => {
		it('links a transaction to a scheduled transaction by payee_id', () => {
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc' });
			const tx = makeTx({ id: 'tx-1', payee_id: 'payee-abc' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(1);
			expect(result[0].history![0].id).toBe('tx-1');
		});

		it('does not link when payee_ids differ', () => {
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc' });
			const tx = makeTx({ id: 'tx-1', payee_id: 'payee-xyz' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(0);
		});

		it('routes multiple transactions to the correct scheduled transactions', () => {
			const st1 = makeST({ id: 'st-1', payee_id: 'payee-1' });
			const st2 = makeST({ id: 'st-2', payee_id: 'payee-2' });
			const tx1 = makeTx({ id: 'tx-1', payee_id: 'payee-1' });
			const tx2 = makeTx({ id: 'tx-2', payee_id: 'payee-2' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx1, tx2], [st1, st2]);
			const r1 = result.find((r) => r.id === 'st-1')!;
			const r2 = result.find((r) => r.id === 'st-2')!;
			expect(r1.history).toHaveLength(1);
			expect(r1.history![0].id).toBe('tx-1');
			expect(r2.history).toHaveLength(1);
			expect(r2.history![0].id).toBe('tx-2');
		});
	});

	describe('matching by payee_name', () => {
		it('links when payee_id is absent but payee_name matches', () => {
			const st = makeST({ id: 'st-1', payee_id: null, payee_name: 'Netflix' });
			const tx = makeTx({ id: 'tx-1', payee_id: null, payee_name: 'Netflix' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(1);
		});

		it('does not link when payee_names differ', () => {
			const st = makeST({ id: 'st-1', payee_name: 'Netflix' });
			const tx = makeTx({ id: 'tx-1', payee_name: 'Hulu' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(0);
		});

		it('does not link when scheduled transaction has no payee_name', () => {
			const st = makeST({ id: 'st-1', payee_id: null, payee_name: null });
			const tx = makeTx({ id: 'tx-1', payee_id: null, payee_name: 'Netflix' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(0);
		});
	});

	describe('matching via subtransactions (split transactions)', () => {
		it('links a split transaction via subtransaction payee_id', () => {
			const st = makeST({ id: 'st-1', payee_id: 'payee-sub' });
			const tx = makeTx({
				id: 'tx-1',
				payee_id: null,
				payee_name: null,
				subtransactions: [
					{
						id: 'sub-1',
						transaction_id: 'tx-1',
						amount: -50000,
						payee_id: 'payee-sub',
						payee_name: null,
						deleted: false
					} as TransactionDetail['subtransactions'][0]
				]
			});
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(1);
			expect(result[0].history![0].id).toBe('tx-1');
		});

		it('links a split transaction via subtransaction payee_name', () => {
			const st = makeST({ id: 'st-1', payee_id: null, payee_name: 'Insurance Co' });
			const tx = makeTx({
				id: 'tx-1',
				payee_id: null,
				payee_name: null,
				subtransactions: [
					{
						id: 'sub-1',
						transaction_id: 'tx-1',
						amount: -50000,
						payee_id: null,
						payee_name: 'Insurance Co',
						deleted: false
					} as TransactionDetail['subtransactions'][0]
				]
			});
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(1);
		});

		it('does not link when no subtransaction payee matches', () => {
			const st = makeST({ id: 'st-1', payee_id: null, payee_name: 'Insurance Co' });
			const tx = makeTx({
				id: 'tx-1',
				payee_id: null,
				payee_name: null,
				subtransactions: [
					{
						id: 'sub-1',
						transaction_id: 'tx-1',
						amount: -50000,
						payee_id: null,
						payee_name: 'Other Co',
						deleted: false
					} as TransactionDetail['subtransactions'][0]
				]
			});
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(0);
		});

		it('stores the parent transaction (not the subtransaction) in history', () => {
			const st = makeST({ id: 'st-1', payee_id: 'payee-sub' });
			const tx = makeTx({
				id: 'tx-parent',
				payee_id: null,
				subtransactions: [
					{
						id: 'sub-1',
						transaction_id: 'tx-parent',
						amount: -50000,
						payee_id: 'payee-sub',
						payee_name: null,
						deleted: false
					} as TransactionDetail['subtransactions'][0]
				]
			});
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history![0].id).toBe('tx-parent');
		});

		it('adds the parent transaction to EACH scheduled transaction matched by a subtransaction', () => {
			// e.g. an "Apple" charge split between Fitbod and Bear subscriptions
			const fitbod = makeST({ id: 'st-fitbod', payee_id: 'payee-fitbod' });
			const bear = makeST({ id: 'st-bear', payee_id: 'payee-bear' });
			const apple = makeTx({
				id: 'tx-apple',
				payee_id: 'payee-apple',
				payee_name: 'Apple',
				subtransactions: [
					{
						id: 'sub-fitbod',
						transaction_id: 'tx-apple',
						amount: -15990,
						payee_id: 'payee-fitbod',
						payee_name: 'Fitbod Subscription',
						deleted: false
					} as TransactionDetail['subtransactions'][0],
					{
						id: 'sub-bear',
						transaction_id: 'tx-apple',
						amount: -2990,
						payee_id: 'payee-bear',
						payee_name: 'Bear',
						deleted: false
					} as TransactionDetail['subtransactions'][0]
				]
			});
			const result = assignHistoricalTransactionsToScheduledTransactions([apple], [fitbod, bear]);
			const fitbodResult = result.find((r) => r.id === 'st-fitbod')!;
			const bearResult = result.find((r) => r.id === 'st-bear')!;
			expect(fitbodResult.history).toHaveLength(1);
			expect(fitbodResult.history![0].id).toBe('tx-apple');
			expect(bearResult.history).toHaveLength(1);
			expect(bearResult.history![0].id).toBe('tx-apple');
		});
	});

	describe('delta merging', () => {
		it('preserves existing history and adds new transactions', () => {
			const existingTx = makeTx({ id: 'tx-old', payee_id: 'payee-abc' });
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc', history: [existingTx] });
			const newTx = makeTx({ id: 'tx-new', payee_id: 'payee-abc' });
			const result = assignHistoricalTransactionsToScheduledTransactions([newTx], [st]);
			expect(result[0].history).toHaveLength(2);
			const ids = result[0].history!.map((t) => t.id);
			expect(ids).toContain('tx-old');
			expect(ids).toContain('tx-new');
		});

		it('removes a transaction marked as deleted from history', () => {
			const existingTx = makeTx({ id: 'tx-1', payee_id: 'payee-abc' });
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc', history: [existingTx] });
			const deletedTx = makeTx({ id: 'tx-1', payee_id: 'payee-abc', deleted: true });
			const result = assignHistoricalTransactionsToScheduledTransactions([deletedTx], [st]);
			expect(result[0].history).toHaveLength(0);
		});

		it('is a no-op when deleting a transaction not present in history', () => {
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc', history: [] });
			const deletedTx = makeTx({ id: 'tx-unknown', payee_id: 'payee-abc', deleted: true });
			const result = assignHistoricalTransactionsToScheduledTransactions([deletedTx], [st]);
			expect(result[0].history).toHaveLength(0);
		});

		it('upserts an updated transaction (same id, updated amount)', () => {
			const original = makeTx({ id: 'tx-1', payee_id: 'payee-abc', amount: -50000 });
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc', history: [original] });
			const updated = makeTx({ id: 'tx-1', payee_id: 'payee-abc', amount: -99000 });
			const result = assignHistoricalTransactionsToScheduledTransactions([updated], [st]);
			expect(result[0].history).toHaveLength(1);
			expect(result[0].history![0].amount).toBe(-99000);
		});
	});

	describe('edge cases', () => {
		it('returns scheduled transactions with preserved history when no fetched transactions', () => {
			const tx = makeTx({ id: 'tx-1', payee_id: 'payee-abc' });
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc', history: [tx] });
			const result = assignHistoricalTransactionsToScheduledTransactions([], [st]);
			expect(result[0].history).toHaveLength(1);
		});

		it('returns an empty array when no scheduled transactions', () => {
			const tx = makeTx({ id: 'tx-1', payee_id: 'payee-abc' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], []);
			expect(result).toHaveLength(0);
		});

		it('skips transactions with no matching scheduled transaction', () => {
			const st = makeST({ id: 'st-1', payee_id: 'payee-abc' });
			const tx = makeTx({ id: 'tx-1', payee_id: 'payee-xyz' });
			const result = assignHistoricalTransactionsToScheduledTransactions([tx], [st]);
			expect(result[0].history).toHaveLength(0);
		});
	});
});
