<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Error | Bills (For YNAB)</title>
</svelte:head>

<div class="flex flex-col justify-center items-center gap-y-6">
	<h1 class="text-xl mb-2">{page.status}</h1>
	<p class="text-gray-400 text-lg">{page?.error?.message ?? 'An unexpected error occurred.'}</p>
	<a class="mt-5 text-blue-500 hover:underline" href={resolve('/')}>Go back to the homepage</a>
</div>
