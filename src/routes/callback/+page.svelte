<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	$effect(() => {
		const hash = page.url.hash.substring(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get('access_token');

		if (accessToken) {
			sessionStorage.setItem('ynab_access_token', accessToken);
			sessionStorage.setItem('ynab_token_write', 'false');
			const redirectTo = sessionStorage.getItem('ynab_post_login_redirect') ?? resolve('/');
			sessionStorage.removeItem('ynab_post_login_redirect');
			goto(redirectTo);
		}
	});
</script>
