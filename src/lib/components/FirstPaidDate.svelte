<script lang="ts">
	import type { CustomScheduledTransactionDetail } from '$lib/db';

	let {
		bill
	}: {
		bill: CustomScheduledTransactionDetail;
	} = $props();

	function convertToReadableDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

{convertToReadableDate(bill.date_first)}
