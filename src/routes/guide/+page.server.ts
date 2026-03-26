import { marked } from 'marked';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const prerender = true;

export function load() {
	const md = readFileSync(resolve('GUIDE.md'), 'utf-8');
	const content = marked(md) as string;
	return { content };
}
