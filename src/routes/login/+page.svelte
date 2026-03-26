<script lang="ts">
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	function getSafeRedirect(redirect: string | null): string {
		if (!redirect) return resolve('/plans');
		try {
			const url = new URL(redirect, window.location.origin);
			if (url.origin !== window.location.origin) return resolve('/plans');
			if (url.pathname === resolve('/login')) return resolve('/plans');
			return url.pathname;
		} catch {
			return resolve('/plans');
		}
	}

	$effect(() => {
		const accessToken = sessionStorage.getItem('ynab_access_token');
		const redirectTo = getSafeRedirect(page.url.searchParams.get('redirect'));

		if (accessToken) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(redirectTo);
			return;
		}

		sessionStorage.setItem('ynab_post_login_redirect', redirectTo);
	});

	let currentUrl = $derived.by(() => {
		if (browser) {
			return page.url.origin;
		}
		return '';
	});

	let readonlyAuthUrl = $derived.by(() => {
		const clientId =
			env.PUBLIC_YNAB_CLIENT_ID.trim().length > 0
				? env.PUBLIC_YNAB_CLIENT_ID
				: 'pSUArM_scyhWolG84x64phZCixdv4rDXkyr3JpzoN34';
		const redirectUri = encodeURI(`${currentUrl}/callback`);
		return `https://app.ynab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=read-only`;
	});

	let writeAllowedAuthUrl = $derived.by(() => {
		const clientId =
			env.PUBLIC_YNAB_CLIENT_ID.trim().length > 0
				? env.PUBLIC_YNAB_CLIENT_ID
				: 'pSUArM_scyhWolG84x64phZCixdv4rDXkyr3JpzoN34';
		const redirectUri = encodeURI(`${currentUrl}/callback/write`);
		return `https://app.ynab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token`;
	});
</script>

<svelte:head>
	<title>Login with YNAB | Bills (For YNAB)</title>
</svelte:head>

<a
	href={resolve('/')}
	class="text-center text-sm text-stone-500 underline-offset-2 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
	>&larr; Back to Home</a
>

<div class="mx-auto flex w-full max-w-sm flex-col items-center gap-8">
	<h1 class="text-lg font-medium text-stone-800 dark:text-stone-200">Login with YNAB</h1>
	<p id="login-recommendation" class="text-center text-sm text-stone-500 dark:text-stone-400">
		Read-only is recommended for most users.
	</p>
	<div class="flex w-full flex-col gap-3">
		<a
			data-sveltekit-reload
			href={readonlyAuthUrl}
			data-tooltip="Import your YNAB data without write access."
			aria-describedby="readonly-desc"
			class="block w-full rounded-lg border border-stone-300 bg-stone-800 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:border-stone-600 dark:bg-stone-700 dark:hover:bg-stone-600"
		>
			Read-Only
		</a>
		<p id="readonly-desc" class="sr-only">Import your YNAB data without write access.</p>
		<a
			data-sveltekit-reload
			href={writeAllowedAuthUrl}
			data-tooltip="Create, edit, and delete bills and sync to YNAB."
			aria-describedby="readwrite-desc"
			class="block w-full rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700/50"
		>
			Read and Write
		</a>
		<p id="readwrite-desc" class="sr-only">Create, edit, and delete bills and sync to YNAB.</p>
	</div>
</div>
