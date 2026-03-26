<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Guide | Bills (For YNAB)</title>
</svelte:head>

<div class="px-4 py-8">
	<a
		href={resolve('/')}
		class="text-sm font-medium text-stone-600 hover:underline dark:text-stone-400"
	>
		&larr; Home
	</a>
</div>

<div class="mx-auto prose max-w-5xl px-4 py-8 dark:prose-invert">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.content}
</div>
