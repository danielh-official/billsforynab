<script lang="ts">
	import { resolve } from '$app/paths';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Privacy | Bills (For YNAB)</title>
</svelte:head>

<div class="px-4 py-4">
	<Breadcrumb items={[{ label: 'Home', href: resolve('/') }, { label: 'Privacy' }]} />
</div>

<div class="prose px-4 py-8 md:mx-auto md:max-w-5xl dark:prose-invert">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.content}
</div>
