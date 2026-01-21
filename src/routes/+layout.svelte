<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import WorksWithYnab from '$lib/components/WorksWithYnab.svelte';
	import { page } from '$app/state';
	import { unsupportedFrequencies } from '$lib';

	let { children } = $props();

	const isDemo = $derived.by(() => {
		return page.params.id === 'demo';
	});
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

		.guide {
			display: flex;
			flex-direction: column;
			align-items: end;
			padding: 0 2rem 1rem 2rem;
			font-size: 1rem;
		}

		.demo-banner {
			background-color: #fffae6;
			border: 1px solid #ffe58f;
			color: #664d03;
			padding: 1rem;
			text-align: center;
		}

		.demo-banner-content {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			max-width: 600px;
			margin: 0 auto;
		}

		.demo-banner-header {
			font-weight: bold;
			font-size: 1.25rem;
		}

		.write-access-note {
			max-width: 600px;
			margin: 0 auto 1rem auto;
			padding: 1rem;
			background-color: #fff3cd;
			border: 1px solid #ffeeba;
			color: #856404;
			border-radius: 4px;
		}
	</style>
</svelte:head>

{#if isDemo}
	<div class="demo-banner">
		<div class="demo-banner-content">
			<div class="demo-banner-header">Demo</div>
			<div>
				You are currently viewing the demo plan. This plan does not receive or send any data from
				YNAB. All data is generated for demonstration purposes only.
			</div>
		</div>
	</div>
{/if}

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

<div class="guide">
	<div>Confused?</div>
	<div>
		Check out the <a
			href="https://github.com/danielh-official/billsforynab/blob/main/GUIDE.md"
			target="_blank"
			rel="noopener noreferrer">guide</a
		>.
	</div>
</div>

<div class="write-access-note">
	<div>
		<b>Note</b>: Due to a bug with YNAB's API, bills with the following frequencies cannot be
		created, updated, or deleted within this interface: {unsupportedFrequencies.join(', ')}.
	</div>
	<div style="margin-top: 0.5rem;">
		You will have to managed these bills directly in
		<a href="https://app.ynab.com" target="_blank" rel="noopener noreferrer">YNAB</a>
	</div>
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
