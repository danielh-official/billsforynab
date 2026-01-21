import { Dexie, type EntityTable } from 'dexie';
import type { BudgetDetail, CategoryGroupWithCategories, ScheduledTransactionDetail } from 'ynab';

interface CustomBudgetDetail extends BudgetDetail {
	is_default?: boolean;
	server_knowledge?: {
		scheduled_transactions?: number;
		category_groups?: number;
	};
	last_fetched?: Date;
}

interface CustomScheduledTransactionDetail extends ScheduledTransactionDetail {
	budget_id: string;
	excluded?: boolean;
	monthly_amount?: number;
	published?: boolean;
}

interface CustomCategoryGroupWithCategories extends CategoryGroupWithCategories {
	budget_id: string;
}

const db = new Dexie('BillsForYnabDB') as Dexie & {
	budgets: EntityTable<CustomBudgetDetail, 'id'>;
	scheduled_transactions: EntityTable<CustomScheduledTransactionDetail, 'id'>;
	category_groups: EntityTable<CustomCategoryGroupWithCategories, 'id'>;
};

db.version(2).stores({
	budgets: 'id',
	scheduled_transactions:
		'id, budget_id, date_first, date_next, frequency, category_name, payee_name',
	category_groups: 'id, budget_id'
});

export type {
	CustomBudgetDetail,
	CustomScheduledTransactionDetail,
	CustomCategoryGroupWithCategories
};
export { db };
