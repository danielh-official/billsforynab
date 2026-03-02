<script lang="ts">
	import type { CustomBudgetDetail } from '$lib/db';

	let {
		currentBudget
	}: {
		currentBudget: CustomBudgetDetail | undefined;
	} = $props();

	// MARK: - Last fetched timestamp formatting

	function formatLastFetched(lastFetched?: Date) {
		if (!lastFetched) return 'Never';

		const date = lastFetched instanceof Date ? lastFetched : new Date(lastFetched);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		// Show relative time if recent
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

		// Otherwise show formatted date
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<p class="text-sm text-stone-600 dark:text-stone-400">
	Last fetched: <strong class="text-stone-900 dark:text-stone-100"
		>{formatLastFetched(currentBudget?.last_fetched)}</strong
	>
</p>
