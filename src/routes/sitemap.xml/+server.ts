export const prerender = true;

export async function GET() {
	const pages = [
		{ loc: 'https://billsforynab.com/', changefreq: 'monthly', priority: '1.0' },
		{ loc: 'https://billsforynab.com/guide', changefreq: 'monthly', priority: '0.8' },
		{ loc: 'https://billsforynab.com/privacy', changefreq: 'yearly', priority: '0.3' }
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `  <url>
    <loc>${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
}
