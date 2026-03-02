<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Error | Bills (For YNAB)</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
	<h1 class="text-lg font-medium text-stone-800 dark:text-stone-200">{page.status}</h1>
	<p class="max-w-md text-sm text-stone-500 dark:text-stone-400">
		{page?.error?.message ?? 'An unexpected error occurred.'}
	</p>
	<a
		href={resolve('/')}
		class="text-sm text-stone-600 underline-offset-2 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
	>
		Back to Home
	</a>
</div>
