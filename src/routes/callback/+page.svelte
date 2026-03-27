<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { fetchBudgets } from '$lib';

	$effect(() => {
		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get('access_token');

		if (accessToken) {
			sessionStorage.setItem('ynab_access_token', accessToken);
			sessionStorage.setItem('ynab_token_write', 'false');
			const redirectTo = sessionStorage.getItem('ynab_post_login_redirect') ?? resolve('/plans');
			sessionStorage.removeItem('ynab_post_login_redirect');
			fetchBudgets(accessToken).then(() => {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(redirectTo);
			});
		}
	});
</script>

<svelte:head>
	<title>Callback (Read-Only) | Bills (For YNAB)</title>
</svelte:head>
