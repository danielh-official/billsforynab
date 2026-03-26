<script lang="ts">
	import type { CustomScheduledTransactionDetail } from '$lib/db';
	import type { ScheduledTransactionFrequency } from 'ynab/dist/models';

	let {
		bill
	}: {
		bill: CustomScheduledTransactionDetail;
	} = $props();

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
</script>

{parseFrequencyText(bill.frequency)}
