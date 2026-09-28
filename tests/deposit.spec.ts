import { test, expect, type Page } from '@playwright/test';
import { createUserWithBalance, loginViaApi } from './help_functions/api';
import { expectBalance, expectTransaction, readTransactionIds, transactionRows } from './help_functions/ui';

async function addBalance(page: Page, amount: number): Promise<void> {
    await page.getByRole('button', { name: 'Add balance' }).click();
    await page.getByPlaceholder('Enter sum').fill(String(amount));
    await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test.describe('Deposit', () => {
    test('dep-1: deposit increases balance and creates a deposit transaction', async ({ page, request }) => {
        const user = await createUserWithBalance(request, 0);
        await loginViaApi(page.request, user);
        await page.goto('/transactions');
        await expectBalance(page, 0);
        await expect(page.getByText('No transactions yet')).toBeVisible();

        await addBalance(page, 250);

        await expectBalance(page, 250);
        await expect(transactionRows(page)).toHaveCount(1);
        await expectTransaction(transactionRows(page).first(), { amount: 250, type: 'deposit', status: 'completed' });

        await page.reload();
        await expectBalance(page, 250);
        await expect(transactionRows(page)).toHaveCount(1);
        await expectTransaction(transactionRows(page).first(), { amount: 250, type: 'deposit', status: 'completed' });
    });

    for (const amount of [0, -100]) {
        test(`dep-2: deposit of ${amount} is not performed`, async ({ page, request }) => {
            const user = await createUserWithBalance(request, 1000);
            await loginViaApi(page.request, user);
            await page.goto('/transactions');
            await expectBalance(page, 1000);
            const idsBefore = await readTransactionIds(page, 1);

            await addBalance(page, amount);

            await expect(page.getByRole('heading', { name: 'Add balance' })).toBeVisible();
            await expectBalance(page, 1000);
            expect(await readTransactionIds(page, 1)).toEqual(idsBefore);
        });
    }
});
