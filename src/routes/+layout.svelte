<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import WorksWithYnab from '$lib/components/WorksWithYnab.svelte';
	import { page } from '$app/state';
	import { unsupportedFrequencies } from '$lib';
	import { PUBLIC_SHOW_API_RESTRICTION_NOTICE } from '$env/static/public';
	import { browser } from '$app/environment';

	let { children } = $props();

	const isDemo = $derived.by(() => {
		return page.params.id === 'demo';
	});

	let showApiScheduledTransactionsNotice = $derived.by(() => {
		return (
			browser && localStorage.getItem('api_scheduled_transactions_notice_dismissed') !== 'true'
		);
	});

	let showApiRestrictionNotice = $derived.by(() => {
		return (
			PUBLIC_SHOW_API_RESTRICTION_NOTICE === 'true' &&
			browser &&
			localStorage.getItem('api_restriction_notice_dismissed') !== 'true'
		);
	});

	function dismissApiRestrictionNotice() {
		if (browser) {
			localStorage.setItem('api_restriction_notice_dismissed', 'true');
			showApiRestrictionNotice = false;
		}
	}

	function dismissApiScheduledTransactionsNotice() {
		if (browser) {
			localStorage.setItem('api_scheduled_transactions_notice_dismissed', 'true');
			showApiScheduledTransactionsNotice = false;
		}
	}

	const atLeastOneNoticeDismissed = $derived.by(() => {
		return !showApiRestrictionNotice || !showApiScheduledTransactionsNotice;
	});

	// Demo mode access type (read-only or read-and-write)
	let demoAccessType = $state<'read-only' | 'read-and-write'>('read-only');

	function switchToReadonlyDemoAccessType() {
		if (!browser) return;
		demoAccessType = 'read-only';
		sessionStorage.setItem('demo_access_type', demoAccessType);
		window.dispatchEvent(new CustomEvent('demoAccessTypeChange', { detail: demoAccessType }));
	}

	function switchToReadAndWriteDemoAccessType() {
		if (!browser) return;
		demoAccessType = 'read-and-write';
		sessionStorage.setItem('demo_access_type', demoAccessType);
		window.dispatchEvent(new CustomEvent('demoAccessTypeChange', { detail: demoAccessType }));
	}

	// Load demo access type from sessionStorage on mount
	$effect(() => {
		if (!browser || !isDemo) return;

		const stored = sessionStorage.getItem('demo_access_type');
		if (stored === 'read-only' || stored === 'read-and-write') {
			demoAccessType = stored;
		}
	});
</script>

<svelte:head>
	<title>Bills (For YNAB)</title>
	<meta
		name="description"
		content="Manage your bills and sync them with your YNAB account. Create, view, and delete budgeting plans easily."
	/>
	<link rel="icon" href={favicon} />
	<script async defer src="https://buttons.github.io/buttons.js"></script>

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

		.star-section {
			display: flex;
			flex-direction: column;
			align-items: end;
			padding: 0 2rem 1rem 2rem;
			font-size: 1rem;
			gap: 0.5rem;
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

		.api-warning {
			max-width: 600px;
			padding: 1rem;
			background-color: #fff3cd;
			border: 1px solid #ffc107;
			border-radius: 4px;
			color: #856404;
			text-align: center;
			margin: 0 auto 1rem auto;
		}

		.api-warning strong {
			display: block;
			margin-bottom: 0.5rem;
		}

		.api-warning .close-button {
			background: none;
			border: none;
			font-size: 1.2rem;
			line-height: 1;
			cursor: pointer;
			color: black;
			display: flex;
			justify-self: end;
		}

		.reactivate-warnings {
			display: flex;
			flex-direction: column;
			align-items: end;
			padding: 0 2rem 1rem 2rem;
			font-size: 1rem;
			gap: 0.5rem;
		}

		.reactivate-warnings button {
			padding: 0.5rem 1rem;
			font-size: 1rem;
			cursor: pointer;
			background-color: transparent;
			color: #0000ff;
		}

		.reactivate-warnings button:hover {
			text-decoration: underline;
		}

		.demo-access-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.75rem;
			margin-top: 1rem;
			padding: 0.75rem;
			background-color: #fff;
			border-radius: 6px;
			border: 1px solid #ffe58f;
		}

		.demo-access-toggle > div:first-child {
			font-weight: 600;
			font-size: 0.95rem;
		}

		.demo-toggle-button {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			border: 2px solid #d4a373;
			border-radius: 4px;
			background-color: #f5f5f5;
			cursor: pointer;
			font-size: 0.9rem;
			transition: all 0.2s ease;
			color: #333;
		}

		.demo-toggle-button:hover {
			background-color: #e8e8e8;
		}

		.demo-toggle-button.active {
			background-color: #d4a373;
			color: #fff;
			font-weight: 600;
		}

		.access-description {
			font-size: 0.85rem;
			margin-top: 0.5rem;
			font-style: italic;
		}

		@media (prefers-color-scheme: dark) {
			.api-warning {
				background-color: #664d03;
				border-color: #997404;
				color: #ffecb5;
			}

			.reactivate-warnings button {
				color: #90caf9;
			}

			.demo-banner {
				background-color: #664d03;
				border: 1px solid #997404;
				color: #ffecb5;
				padding: 1rem;
				text-align: center;
			}

			.demo-access-toggle {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 0.75rem;
				margin-top: 1rem;
				padding: 0.75rem;
				background-color: #333333;
				border-radius: 6px;
				border: 1px solid #997404;
			}
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
			<div class="demo-access-toggle">
				<div aria-label="Access Type">Access Type:</div>
				<button
					class="demo-toggle-button"
					class:active={demoAccessType === 'read-only'}
					onclick={switchToReadonlyDemoAccessType}
					aria-label="Toggle to read-only access"
				>
					🔒 Read-Only
				</button>
				<button
					class="demo-toggle-button"
					class:active={demoAccessType === 'read-and-write'}
					onclick={switchToReadAndWriteDemoAccessType}
					aria-label="Toggle to read and write access"
				>
					✏️ Read &amp; Write
				</button>
			</div>
			<div class="access-description">
				{#if demoAccessType === 'read-only'}
					With read-only access, you can view bills but cannot create, edit, or delete them.
				{:else}
					With read and write access, you can create, edit, and delete bills in YNAB.
				{/if}
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

<div class="star-section">
	<div>Like this app? Give us a star.</div>
	<a
		class="github-button"
		href="https://github.com/danielh-official/billsforynab"
		data-icon="octicon-star"
		data-size="large"
		data-show-count="true"
		aria-label="Star danielh-official/billsforynab on GitHub">Star</a
	>
</div>

{#if atLeastOneNoticeDismissed}
	<div class="reactivate-warnings">
		<button
			type="button"
			onclick={() => {
				if (browser) {
					localStorage.removeItem('api_restriction_notice_dismissed');
					localStorage.removeItem('api_scheduled_transactions_notice_dismissed');
					showApiRestrictionNotice = true;
					showApiScheduledTransactionsNotice = true;
				}
			}}
			disabled={!atLeastOneNoticeDismissed}
		>
			Show Dismissed Warnings
		</button>
	</div>
{/if}

{#if showApiRestrictionNotice}
	<div class="api-warning">
		<button class="close-button" aria-label="Dismiss notice" onclick={dismissApiRestrictionNotice}
			>&times;</button
		>
		<strong>⚠️ API Restriction Notice</strong>
		<p>
			The YNAB API client for this app is currently restricted to 25 access tokens. If you encounter
			issues logging in, please see the <a
				href="https://github.com/danielh-official/billsforynab/blob/main/GUIDE.md#api-restriction-notice"
				target="_blank"
				rel="noopener noreferrer">user guide</a
			> for instructions on setting up the app locally with your own YNAB API client.
		</p>
	</div>
{/if}

{#if showApiScheduledTransactionsNotice}
	<div class="api-warning">
		<button
			class="close-button"
			aria-label="Dismiss notice"
			onclick={dismissApiScheduledTransactionsNotice}>&times;</button
		>
		<strong>⚠️ API Bug Notice</strong>
		<p>
			Due to a bug with YNAB's API, bills with the following frequencies cannot be created, updated,
			or deleted within this interface: {unsupportedFrequencies.join(', ')}.
		</p>
		<p style="margin-top: 0.5rem;">
			You will have to manage these bills directly in
			<a href="https://app.ynab.com" target="_blank" rel="noopener noreferrer">YNAB</a>
		</p>
	</div>
{/if}

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
