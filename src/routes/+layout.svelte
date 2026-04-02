<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import '$lib/app.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import WorksWithYnab from '$lib/components/WorksWithYnab.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	injectSpeedInsights();
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();

	let loading = $state(true);

	let authToken = $state<string | null>(null);

	$effect(() => {
		if (!browser) return;

		setTimeout(() => {
			loading = false;
		}, 100);

		authToken = sessionStorage.getItem('ynab_access_token');

		setTimeout(() => {
			if (authToken) return;

			authToken = sessionStorage.getItem('ynab_access_token');
		}, 500);
	});

	const isDemo = $derived.by(() => {
		return page.params.id === 'demo';
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
	<link rel="canonical" href={`https://billsforynab.com${page.url.pathname}`} />

	<!-- Open Graph -->
	<meta property="og:site_name" content="Bills (For YNAB)" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:title" content="Bills (For YNAB)" />
	<meta
		property="og:description"
		content="Manage your bills and sync them with your YNAB account."
	/>

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Bills (For YNAB)" />
	<meta
		name="twitter:description"
		content="Manage your bills and sync them with your YNAB account."
	/>
</svelte:head>

{#if isDemo}
	<div
		class="border-b border-stone-200 bg-stone-100 py-3 text-center dark:border-stone-700 dark:bg-stone-800/50"
		role="region"
		aria-label="Demo mode banner"
	>
		<div class="mx-auto flex max-w-xl flex-col gap-2 text-sm text-stone-600 dark:text-stone-400">
			<span class="font-medium text-stone-800 dark:text-stone-200">Demo</span>
			<p class="mb-2">This plan does not send or receive data from YNAB.</p>
			<div
				class="flex items-center justify-center gap-2"
				role="group"
				aria-label="Demo access type"
			>
				<span class="text-stone-500 dark:text-stone-500" id="demo-access-label">Access:</span>
				<button
					class="rounded border px-3 py-1.5 text-sm transition-colors {demoAccessType ===
					'read-only'
						? 'border-stone-700 bg-stone-700 text-white dark:bg-stone-600'
						: 'border-stone-300 bg-transparent text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800'}"
					onclick={switchToReadonlyDemoAccessType}
					aria-pressed={demoAccessType === 'read-only'}
				>
					Read-Only
				</button>
				<button
					class="rounded border px-3 py-1.5 text-sm transition-colors {demoAccessType ===
					'read-and-write'
						? 'border-stone-700 bg-stone-700 text-white dark:bg-stone-600'
						: 'border-stone-300 bg-transparent text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800'}"
					onclick={switchToReadAndWriteDemoAccessType}
					aria-pressed={demoAccessType === 'read-and-write'}
				>
					Read & Write
				</button>
			</div>
		</div>
	</div>
{/if}

{#if !loading}
	<header>
		<nav
			class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 p-5 md:flex-row"
			aria-label="Site navigation"
		>
			<div class="flex items-center gap-6">
				<a class="text-xl font-bold" href={resolve('/')}>Bills (For YNAB)</a>
			</div>
			<div class="flex flex-col items-center gap-4 lg:flex-row">
				<ThemeToggle />
				{#if authToken}
					<button
						type="button"
						class="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700/50"
						onclick={() => {
							sessionStorage.removeItem('ynab_access_token');
							sessionStorage.removeItem('ynab_token_write');
							location.reload();
						}}
					>
						Log out
					</button>
				{:else}
					<a
						href="{resolve('/login')}?redirect={encodeURIComponent(
							page.url.pathname !== resolve('/login') ? page.url.pathname : resolve('/plans')
						)}"
						class="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700/50"
					>
						Login
					</a>
				{/if}
			</div>
		</nav>
	</header>

	<main class="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-10 px-6 py-10">
		{@render children()}
	</main>

	<footer
		class="flex w-full flex-col rounded-lg border border-stone-200 bg-stone-100 px-6 py-10 text-center text-sm dark:border-stone-700 dark:bg-stone-800/50"
	>
		<p class="text-stone-500 dark:text-stone-400">
			© {new Date().getFullYear()} Bills (For YNAB)
		</p>
		<p
			class="mt-3 flex flex-wrap items-center justify-center gap-4 text-stone-500 dark:text-stone-400"
		>
			<a href="/privacy" class="text-gray-500 hover:underline dark:text-gray-300">Privacy Policy</a>
			<a href={resolve('/guide')} class="text-gray-500 hover:underline dark:text-gray-300">Guide</a>
			<a
				href="https://ynab.com/referral/?ref=5uhATdvN0mdkvJzq&sponsor_name=DanielH&utm_source=customer_referral"
				target="_blank"
				rel="noopener sponsored"
				class="text-gray-500 hover:underline dark:text-gray-300">Referral (1 mo free)</a
			>
			<a
				href="https://github.com/danielh-official/billsforynab"
				class="text-gray-500 hover:underline dark:text-gray-300"
				target="_blank"
				rel="noopener noreferrer">GitHub</a
			>
		</p>
		<div class="mt-4 flex justify-center">
			<WorksWithYnab />
		</div>
		<p class="mt-4 min-[1450px]:mx-auto min-[1450px]:max-w-xl">
			<b class="text-gray-700 dark:text-gray-300">Statement of Affiliation</b>: We are not
			affiliated, associated, or in any way officially connected with YNAB or any of its
			subsidiaries or affiliates. The official YNAB website can be found at
			<a class="app-link" href="https://www.ynab.com" target="_blank" rel="noopener noreferrer"
				>https://www.ynab.com</a
			>. The names YNAB and You Need A Budget, as well as related names, tradenames, marks,
			trademarks, emblems, and images are registered trademarks of YNAB.
		</p>
		<p class="mx-auto max-w-2xl">
			&copy; {new Date().getFullYear()} Daniel Hotyanov
		</p>
	</footer>
{/if}
