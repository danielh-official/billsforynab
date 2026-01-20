# Bills (For YNAB)

A web app for tracking bills (recurring expenses) with YNAB.

Built on [SvelteKit](https://svelte.dev/docs/kit/introduction).

For any bug reports or feature requests, visit the [issues](https://github.com/danielh-official/billsforynab/issues) page.

## Local Development

1. Fork and clone

```bash
git clone https://github.com/YOUR-USERNAME/billsforynab.git
cd billsforynab
```

2. Install packages: `bun install`
3. Copy .env.example to .env

```
cp .env.example .env
```

You should see this .env:

```
PUBLIC_ADAPTER='static'
PUBLIC_BASE_PATH='/billsforynab'
PUBLIC_YNAB_CLIENT_ID='your-ynab-client-id-here'
```

Make sure to edit the values in your .env file. The defaults are set for my GitHub pages site, where PUBLIC_YNAB_CLIENT_ID should be edited. The official Oauth Client App won't accept local dev urls as callbacks, so you'll have to make your own at [YNAB Developer Settings](https://app.ynab.com/settings/developer).

Click "New Application" and enter details for your fork.

In the "Redirect URI(s) text box, you should input your local server url + '/callback' (e.g., http://localhost:5173/callback).

Click Save Application, and then copy the Client ID and paste it as the value for `PUBLIC_YNAB_CLIENT_ID`.

4. Run the server: `bun dev`

Some changes may not show for dev. To catch these, run `bun run build` and then run `bun preview` to preview how the app would work on a Production-esque environment. You must run `bun run build` each time you make changes (unlike with `bun dev`, which auto-refreshes).

---

## Important Details To Consider

For information on how your YNAB data is received and stored, view the [privacy policy](./PRIVACY.md).

> [!IMPORTANT]
> At this time, there is no automatic sync engine to backup your data to a server database on any of my deployments of this code.

Your data is stored 100% locally on your browser for the given domain (.e.g, [https://danielh-official.github.io/billsforynab](https://danielh-official.github.io/billsforynab)).

YNAB data is property of YNAB and can always be retrieved again via the API.

As this instance of Bills For YNAB is open-source, you may fork this repository at any time, add any features or improvements, and deploy your own version to your own domain (e.g., `mypersonaldeploymentofbillsforynab.netlify.app`).
