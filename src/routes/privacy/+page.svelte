<script lang="ts">
	let { data } = $props();
</script>

<div class="mx-auto prose max-w-3xl px-4 py-8 dark:prose-invert">
	{@html data.content}
</div>