import { Dexie, type EntityTable } from 'dexie';
import type { BudgetDetail, ScheduledTransactionDetail } from 'ynab';

interface CustomBudgetDetail extends BudgetDetail {
	is_default?: boolean;
	scheduled_transactions_server_knowledge?: number;
	scheduled_transactions_last_fetched?: Date;
}

interface CustomScheduledTransactionDetail extends ScheduledTransactionDetail {
	budget_id: string;
}

const db = new Dexie('BillsForYnabDB') as Dexie & {
	budgets: EntityTable<CustomBudgetDetail, 'id'>;
	scheduled_transactions: EntityTable<CustomScheduledTransactionDetail, 'id'>;
};

db.version(1).stores({
	budgets: 'id',
	scheduled_transactions:
		'id, budget_id, date_first, date_next, deleted, frequency, category_name, payee_name'
});

export type { CustomBudgetDetail, CustomScheduledTransactionDetail };
export { db };
