<script lang="ts">
	import { browser } from '$app/environment';

	type Theme = 'system' | 'light' | 'dark';
	let theme = $state<Theme>('system');

	function applyTheme() {
		if (!browser) return;
		const isDark =
			theme === 'dark' ||
			(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.classList.toggle('dark', isDark);
	}

	$effect(() => {
		if (!browser) return;
		const stored = localStorage.getItem('theme');
		if (stored === 'system' || stored === 'light' || stored === 'dark') {
			theme = stored;
		}
	});

	$effect(() => {
		if (!browser) return;
		applyTheme();
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if (theme === 'system') applyTheme();
		};
		media.addEventListener('change', handler);
		return () => media.removeEventListener('change', handler);
	});

	$effect(() => {
		if (!browser) return;
		const handler = (e: StorageEvent) => {
			if (e.key === 'theme' && (e.newValue === 'system' || e.newValue === 'light' || e.newValue === 'dark')) {
				theme = e.newValue;
				applyTheme();
			}
		};
		window.addEventListener('storage', handler);
		return () => window.removeEventListener('storage', handler);
	});

	function setTheme(next: Theme) {
		theme = next;
		localStorage.setItem('theme', next);
		applyTheme();
	}
</script>

<div
	class="flex rounded-lg border border-stone-300 dark:border-stone-600"
	role="group"
	aria-label="Theme"
>
	<button
		type="button"
		class="rounded-l-md border-r border-stone-300 px-2.5 py-1.5 text-xs font-medium transition-colors dark:border-stone-600 {theme ===
		'system'
			? 'bg-stone-200 text-stone-900 dark:bg-stone-600 dark:text-stone-100'
			: 'bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700/50'}"
		onclick={() => setTheme('system')}
		aria-pressed={theme === 'system'}
	>
		System
	</button>
	<button
		type="button"
		class="border-r border-stone-300 px-2.5 py-1.5 text-xs font-medium transition-colors dark:border-stone-600 {theme ===
		'light'
			? 'bg-stone-200 text-stone-900 dark:bg-stone-600 dark:text-stone-100'
			: 'bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700/50'}"
		onclick={() => setTheme('light')}
		aria-pressed={theme === 'light'}
	>
		Light
	</button>
	<button
		type="button"
		class="rounded-r-md px-2.5 py-1.5 text-xs font-medium transition-colors {theme ===
		'dark'
			? 'bg-stone-200 text-stone-900 dark:bg-stone-600 dark:text-stone-100'
			: 'bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700/50'}"
		onclick={() => setTheme('dark')}
		aria-pressed={theme === 'dark'}
	>
		Dark
	</button>
</div>
