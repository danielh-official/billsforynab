import staticAdapter from '@sveltejs/adapter-static';
import autoAdapter from '@sveltejs/adapter-auto';
import netlifyAdapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import dotenv from 'dotenv';

dotenv.config();

function getAdapter() {
	const selectedAdapter = process.env.PUBLIC_ADAPTER || 'static';

	console.log('The current selected adapter is:', selectedAdapter);

	if (selectedAdapter === 'auto') {
		return autoAdapter();
	}

	if (selectedAdapter === 'netlify') {
		return netlifyAdapter();
	}

	return staticAdapter({
		pages: 'build',
		assets: 'build',
		fallback: '404.html',
		precompress: false,
		strict: true
	});
}

function getBasePath() {
	return process.env.PUBLIC_BASE_PATH || '';
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: getAdapter(),
		paths: {
			base: getBasePath()
		},
		csp: {
			directives: {
				'img-src': ["'self'", 'data:']
			}
		},
		csrf: {
			trustedOrigins: [process.env.PUBLIC_BASE_PATH || '']
		}
	}
};

export default config;
