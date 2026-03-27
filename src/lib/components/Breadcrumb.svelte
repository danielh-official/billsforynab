<script lang="ts">
	interface BreadcrumbItem {
		label: string;
		href?: string;
	}

	let { items }: { items: BreadcrumbItem[] } = $props();
</script>

<nav aria-label="Breadcrumb">
	<ol class="flex flex-wrap items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
		{#each items as item, i (i)}
			{#if i > 0}
				<li aria-hidden="true" class="text-stone-300 select-none dark:text-stone-600">/</li>
			{/if}
			<li>
				{#if item.href}
					<a href={item.href} class="hover:text-stone-800 hover:underline dark:hover:text-stone-200"
						>{item.label}</a
					>
				{:else}
					<span class="font-medium text-stone-700 dark:text-stone-200">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
