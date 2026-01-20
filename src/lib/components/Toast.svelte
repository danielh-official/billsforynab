<script lang="ts">
	let {
		message,
		type,
		visible = $bindable()
	}: {
		message: string;
		type: 'success' | 'error' | 'info';
		visible: boolean;
	} = $props();

	function close() {
		visible = false;
	}

	// Auto-dismiss after 4 seconds
	$effect(() => {
		if (visible) {
			const timeout = setTimeout(close, 4000);
			return () => clearTimeout(timeout);
		}
	});
</script>

{#if visible}
	<div
		class="toast"
		class:error={type === 'error'}
		class:success={type === 'success'}
		class:info={type === 'info'}
	>
		<p>{message}</p>
		<button onclick={close} aria-label="Close toast">✕</button>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: #333;
		color: white;
		padding: 16px 24px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: slideIn 0.3s ease-out;
		z-index: 1000;
	}

	.toast.error {
		background: #dc2626;
	}

	.toast.success {
		background: #16a34a;
	}

	.toast.info {
		background: #2563eb;
	}

	.toast p {
		margin: 0;
		flex: 1;
	}

	.toast button {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 20px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.toast button:hover {
		opacity: 1;
	}

	@keyframes slideIn {
		from {
			transform: translateX(400px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (prefers-color-scheme: dark) {
		.toast {
			background: #1f2937;
		}
	}
</style>
