# Privacy

**Last Updated: February 7, 2026**

Thank you for choosing Bills (For YNAB) (referred to as “we,” “our,” or “us”). We are committed to protecting your privacy and handling your data with the utmost care. This privacy policy outlines how we handle, store, and secure the data obtained through the YNAB API to ensure your confidence and peace of mind while using our services.

## Data Handling, Storage, and Security

Bills uses the YNAB API to access and retrieve financial data from your YNAB account. This data includes, but is not limited to plan information and scheduled transactions.

The data obtained through the YNAB API is used solely for the purpose of providing our services to you. It allows us to analyze and present your bill data. We will not use this data for any other purpose without your explicit consent.

Most data retrieved from YNAB is stored in the `BillsForYnabDB` IndexedDB on your browser. Your access token, which is used to authorize the app to retrieve data from YNAB, is stored in session storage, which gets cleared whenever you close your browser.

Furthermore, the authorization method (Implicit Grant Flow) for your access token ensures it expires 2 hours after receipt.

Your IndexedDB data will be stored for as long as you use the application or until you delete it. Session storage data will be cleared whenever you close your browser.

Your data is secured using the encryption and isolation standards of the browser you access the app from.

## Consent

The current data being fetched from YNAB is your scheduled transactions. By using the app, you consent to the retrieval and use of this data for the purpose of providing our services.

If there is any change in the type of data being accessed or how we use your data, we will notify you and obtain your consent before proceeding.

## Read-Only vs. Read/Write Access

You have the option to log into YNAB with either "Read-Only" or "Read/Write" access. "Read-Only" access allows the app to view your data without making any changes, while "Read/Write" access allows the app to make changes to your YNAB account.

Use the "Read-Only" access whenever possible to minimize the risk of unintended changes to your YNAB account.

If you want to create, update, or delete a bill in "Bills (For YNAB)" and send the changes to YNAB, use "Read/Write" access.

## Data Deletion

You may delete all your data stored in the `BillsForYnabDB` IndexedDB at any time. This action will remove all your financial data from the application.

Because your data is stored locally instead of in a server, we cannot delete it for you.

You may delete the data using the methods below.

### Via the Application

Go to the home page and click "Delete" next to the plan you want to delete. This will delete all data tied to the plan.

### Via Developer Tools (Chrome) - Deleting All Data

1. Right-click > Inspect
2. Find the "Application" tab
3. Find "IndexedDB" under "Storage"
4. Expand "IndexedDB" and select "BillsForYnabDB"
5. Click on the database and then click "Delete Database"

## Confidentiality

Due to the local nature of storage and your ability to self-host, we are unable to access your data without having access to your computer.

If you choose to share your data with us for any reason, we will handle it with the utmost care and confidentiality. At no point will we sell, trade, or otherwise transfer your personally identifiable information to outside parties without your consent.

Data obtained through the YNAB API will not unknowingly be passed to any third party.

## Changes to this Privacy Policy

We reserve the right to modify or update this privacy policy at any time to reflect changes in our practices or for legal or regulatory reasons. When we make significant changes to this policy, they will be reflected on the website. We encourage you to review this policy periodically to stay informed about how we handle and protect your data.

## Statement of Affiliation

We are not affiliated, associated, or in any way officially connected with YNAB or any of its subsidiaries or affiliates. The official YNAB website can be found at https://www.ynab.com.

The names YNAB and You Need A Budget, as well as related names, tradenames, marks, trademarks, emblems, and images are registered trademarks of YNAB.
