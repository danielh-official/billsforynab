# How to Use Bills (For YNAB)

## Getting Started

Welcome to Bills (For YNAB)!

This app helps you track and visualize your recurring bills from YNAB.

### Setting Up Your Own Instance

Follow these steps to run the app locally:

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/YOUR-USERNAME/billsforynab.git
   cd billsforynab
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Create your own YNAB OAuth application:**
   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Click "New Application"
   - Enter a name for your application (e.g., "My Bills for YNAB")
   - In the "Redirect URI(s)" field, enter: http://localhost:5173/callback and http://localhost:5173/callback/write (replace "5173" with whatever port you're running on if it's different)
   - Click "Save Application"
   - Copy the Client ID

4. **Configure your environment:**

   ```bash
   cp .env.example .env
   ```

   Edit the .env file and set:

   ```
   PUBLIC_YNAB_CLIENT_ID='your-client-id-from-step-3'
   ```

5. **Run the development server:**

   ```bash
   bun dev
   ```

6. Open your browser to http://localhost:5173 and log in with your YNAB account.

You can also find instructions in the [README](https://github.com/danielh-official/billsforynab/blob/main/README.md#local-development).

For any issues, [write one](https://github.com/danielh-official/billsforynab/issues/new).

## Login

Navigate to the login page at /login and select either one of the options:

- Read-Only: permissions that only allow reading from YNAB but no writes
- Read and Write: allows readin from and writing to YNAB

Choose your default plan and click Authorize.

## Getting Plans

1. Click "Read-Only", then click "Authorize" on the YNAB page
   - Alternatively, you can click "Read and Write", which gives you access to more features (see: [In a Plan (Read and Write)](#in-a-plan-read-and-write)).
2. Click "Fetch plans" to get all your plans from YNAB
   - If you want to test the app out first, create a demo plan instead
3. Click "View" to enter a plan and "Delete" to delete the plan after confirming

## In a Plan (Read-Only)

### Fetching Your Bills

1. Click the "Fetch Data" button to retrieve your data from YNAB
2. The app will automatically calculate monthly equivalents for all frequencies (weekly, yearly, etc.)
3. Your data is stored locally in your browser for offline access

### Sorting and Layout

Use the "Sort:" dropdown to organize your bills:

- **Next Due Date (Ascending):** See which bills are coming up soon
- **Monthly Amount (Descending):** Sort by the monthly equivalent amount

Use the Grid/List toggle to switch between a card grid view and a compact list view.

### Excluding Bills

Click the checkmark or eye icon on any bill to exclude or include it in your totals. Excluded bills appear grayed out and won't count toward your monthly/yearly totals.

### Understanding the Stats

- **Total per month:** The sum of all included bills converted to a monthly amount
- **Total per year:** Your monthly total multiplied by 12
- **Last Fetched Date:** When data was last retrieved from YNAB
- **Excluded:** The number of bills currently excluded from totals

### Resetting Your Data

If you need to start fresh, click "Reset Data" to clear all locally stored scheduled transactions for this plan. You can then re-fetch from YNAB.

### Demo Mode

If you're viewing the demo plan, you'll see sample data to explore the app's features without connecting your YNAB account.

## In a Plan (Read and Write)

> [!NOTE]
> Because of an issue with YNAB API, the only allowed frequencies are daily, weekly, monthly, and yearly. If you want to manage a bill with a different frequency, you'll have to work on its equivalent scheduled transaction in [YNAB](https://app.ynab.com).

You get everything with read-only access PLUS:

> The ability to create, edit, and delete bills from here and have the changes show up in your YNAB.

You have the option of creating a bill as draft or published:

- Draft Bills: If you just want to see what your bill will look like without sending it to YNAB, you can create a bill as a draft. This is saved locally in your browser. (NOTE: if you clear all storage or use a new browser, the bill won't be available like it would be if it were published.)
- Published Bills: If you want to sync the bill to YNAB immediately, create it with the "published" checkbox checked (or click on the upload icon and confirm to publish a draft).

To create a new bill, click "Create Bill". To edit a bill, click the pencil icon.

- Account is required
- Date is required
- Amount must be greater than 0

To delete a bill, click the trash icon and confirm.

### Demo Mode

In the demo plan, you have access to all operations, but since you're not actually using the YNAB API, any calls for published bills are fake.
