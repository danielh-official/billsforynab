<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import WorksWithYnab from '$lib/components/WorksWithYnab.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Bills (For YNAB)</title>
	<link rel="icon" href={favicon} />

	<style>
		.logo {
			display: flex;
			justify-content: end;
			align-items: center;
			padding: 2rem;
		}

		.referral {
			display: flex;
			flex-direction: column;
			align-items: end;
			justify-content: center;
			padding: 0 2rem 2rem 2rem;
		}

		.referral-link {
			display: flex;
			justify-content: end;
			align-items: center;
		}

		.footer-links {
			display: flex;
			gap: 1rem;
			justify-content: center;
			align-items: center;
		}
	</style>
</svelte:head>

<div class="logo">
	<WorksWithYnab />
</div>

<div class="referral">
	<div class="referral-link">
		<a
			href="https://ynab.com/referral/?ref=5uhATdvN0mdkvJzq&sponsor_name=DanielH&utm_source=customer_referral"
			target="_blank"
			rel="noopener noreferrer"
		>
			Referral Link
		</a>
	</div>

	<small>(get 1 more month free)</small>
</div>

<main>
	{@render children()}
</main>

<footer>
	<p>
		&copy; {new Date().getFullYear()} Bills (For YNAB). Built with
		<a href="https://svelte.dev" target="_blank" rel="noopener noreferrer">SvelteKit</a>.
		<!-- TODO: Determine favicon and add reference here if requires citation -->
		<!-- <br />
		<a
			target="_blank"
			rel="noopener noreferrer"
			href="https://www.flaticon.com/free-icons/coin"
			title="coin icons">Coin icons created by Ardiansyah - Flaticon</a
		> -->
	</p>
	<p class="footer-links">
		<a
			target="_blank"
			rel="noopener noreferrer"
			href="https://github.com/danielh-official/billsforynab/blob/main/PRIVACY.md">Privacy Policy</a
		>
		<a
			target="_blank"
			rel="noopener noreferrer"
			href="https://github.com/danielh-official/billsforynab">Repository</a
		>
	</p>
	<p>
		<b>Statement of Affiliation</b>: We are not affiliated, associated, or in any way officially
		connected with YNAB or any of its subsidiaries or affiliates. The official YNAB website can be
		found at
		<a href="https://www.ynab.com" target="_blank" rel="noopener noreferrer">https://www.ynab.com</a
		>. The names YNAB and You Need A Budget, as well as related names, tradenames, marks,
		trademarks, emblems, and images are registered trademarks of YNAB.
	</p>
</footer>
