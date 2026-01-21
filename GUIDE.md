# How to Use Bills (For YNAB)

## Getting Started

Welcome to Bills (For YNAB)!

This app helps you track and visualize your recurring bills from YNAB.

## Getting Plans

1. Click "Login With YNAB (Read-Only)", select your default plan and click "Authorize"
   - Alternatively, you can click "Login With YNAB (Read and Write)", which gives you access to more features (see: [In a Plan (Read and Write)](#in-a-plan-read-and-write)).
2. Click "Fetch Plans" to get all your plans from YNAB
   - If you want to test the app out first, create a demo plan instead
3. Click "View" to enter a plan and "Delete" to delete the plan after confirming

## In a Plan (Read-Only)

### Fetching Your Bills

1. Click the "Fetch Data" button to retrieve your data from YNAB
2. The app will automatically calculate monthly equivalents for all frequencies (weekly, yearly, etc.)
3. Your data is stored locally in your browser for offline access

### Sorting Your Bills

Use the sorting options to organize your bills:

- **Next Due Date:** See which bills are coming up soon
- **Monthly Amount:** Sort by the monthly equivalent amount

Toggle between ascending and descending order using the "Sort Direction" dropdown.

### Excluding Bills

Click the checkmark (✓) or eye (👁️) icon on any bill to exclude or include it in your totals. Excluded bills appear grayed out and won't count toward your monthly/yearly totals.

### Understanding the Stats

- **Total Bills Per Month:** The sum of all bills converted to a monthly amount
- **Total Bills Per Year:** Your monthly total multiplied by 12

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
- Published Bills: If you want to sync the bill to YNAB immediately, create it with the "published" checkbox checked (or click on the "🚀" icon and confirm to publish a draft).

To create a new bill, click "Create Bill". To edit a bill, click the "✏️" icon.

- Account is required
- Date is required
- Amount must be greater than 0

To delete a bill, click the "🗑️" icon and confirm.

### Demo Mode

In the demo plan, you have access to all operations, but since you're not actually using the YNAB API, any calls for published bills are fake.
