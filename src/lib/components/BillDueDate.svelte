<script lang="ts">
	import type { CustomScheduledTransactionDetail } from '$lib/db';
	import { SvelteDate } from 'svelte/reactivity';

	let {
		bill
	}: {
		bill: CustomScheduledTransactionDetail;
	} = $props();

	// MARK: - Date formatting

	function convertToReadableDate(dateString: string) {
		const date = new SvelteDate(dateString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// MARK: - Relative date formatting

	function getRelativeDate(dateString: string) {
		const today = new SvelteDate();
		const targetDate = new SvelteDate(dateString);
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

	// MARK: - Due date color coding

	// Color coding constants
	const RED_RANGE_DAYS = 7; // 0-7 days: Red gradient
	const YELLOW_RANGE_DAYS = 30; // 8-30 days: Yellow gradient
	const GREEN_RANGE_DAYS = 30; // Days for green gradient transition (31-60 days)
	const TEXT_COLOR_THRESHOLD = 0.5; // Ratio threshold for switching text color

	/**
	 * Calculate gradient colors for due dates based on proximity to today
	 * Red (closest) -> Yellow (mid-range) -> Green (furthest)
	 * @param dateString - The due date string in ISO 8601 format (e.g., "2026-01-26T00:00:00")
	 * @returns Object with backgroundColor (CSS color string) and textColor (CSS color string)
	 * @example
	 * // Returns red for dates within 7 days
	 * getDueDateColors("2026-01-26T00:00:00") // { backgroundColor: "rgb(255, 0, 0)", textColor: "#FFFFFF" }
	 * // Returns yellow for dates 8-30 days away
	 * getDueDateColors("2026-02-15T00:00:00") // { backgroundColor: "rgb(220, 200, 0)", textColor: "#000000" }
	 * // Returns green for dates 31+ days away
	 * getDueDateColors("2026-03-01T00:00:00") // { backgroundColor: "rgb(150, 220, 40)", textColor: "#000000" }
	 */
	function getDueDateColors(dateString: string): { backgroundColor: string; textColor: string } {
		const today = new SvelteDate();
		today.setHours(0, 0, 0, 0);
		const targetDate = new SvelteDate(dateString);
		targetDate.setHours(0, 0, 0, 0);
		const diffTime = targetDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		let backgroundColor: string;
		let textColor: string;

		if (diffDays < 0) {
			// Overdue: Dark red
			backgroundColor = '#8B0000';
			textColor = '#FFFFFF';
		} else if (diffDays <= RED_RANGE_DAYS) {
			// 0-7 days: Red gradient
			const ratio = diffDays / RED_RANGE_DAYS;
			// Transition from bright red to orange
			const red = 255;
			const green = Math.round(ratio * 100); // 0 to 100
			const blue = 0;
			backgroundColor = `rgb(${red}, ${green}, ${blue})`;
			textColor = '#FFFFFF';
		} else if (diffDays <= YELLOW_RANGE_DAYS) {
			// 8-30 days: Yellow gradient
			const ratio = (diffDays - RED_RANGE_DAYS) / (YELLOW_RANGE_DAYS - RED_RANGE_DAYS);
			// Transition from orange/yellow to light yellow
			const red = Math.round(255 - ratio * 55); // 255 to 200
			const green = Math.round(100 + ratio * 155); // 100 to 255
			const blue = 0;
			backgroundColor = `rgb(${red}, ${green}, ${blue})`;
			textColor = ratio > TEXT_COLOR_THRESHOLD ? '#000000' : '#FFFFFF';
		} else {
			// 31+ days: Green gradient (capped at 60 days)
			const ratio = Math.min((diffDays - YELLOW_RANGE_DAYS) / GREEN_RANGE_DAYS, 1);
			// Transition from light green to darker green
			const red = Math.round(200 - ratio * 110); // 200 to 90
			const green = Math.round(255 - ratio * 75); // 255 to 180
			const blue = Math.round(0 + ratio * 80); // 0 to 80
			backgroundColor = `rgb(${red}, ${green}, ${blue})`;
			textColor = '#000000';
		}

		return { backgroundColor, textColor };
	}

	const dueDateColors = $derived.by(() => getDueDateColors(bill.date_next));
</script>

<p>
	<span
		class="inline-block rounded px-2 py-0.5 text-sm font-semibold"
		style="background-color: {dueDateColors.backgroundColor}; color: {dueDateColors.textColor};"
	>
		{convertToReadableDate(bill.date_next)} ({getRelativeDate(bill.date_next)})
	</span>
</p>
