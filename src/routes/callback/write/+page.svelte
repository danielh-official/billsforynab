<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	// import { PUBLIC_BASE_PATH } from '$env/static/public';
	import { resolve } from '$app/paths';

	onMount(() => {
		const hash = page.url.hash.substring(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get('access_token');

		if (accessToken) {
			sessionStorage.setItem('ynab_access_token', accessToken);
			sessionStorage.setItem('ynab_token_write', 'true');
			// const path = PUBLIC_BASE_PATH || '/';
			goto(resolve('/'));
		}
	});
</script>
