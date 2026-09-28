import { test, expect, type Page } from '@playwright/test';
import { createUserWithBalance, loginViaApi } from './help_functions/api';
import { expectBalance, expectTransaction, findNewTransactionRow, readTransactionIds, submitTransfer } from './help_functions/ui';

const VALID_PHONE = '+7 (999) 999-99-99';

function errorMessage(page: Page) {
    return page.locator('.field-error, .snackbar.error');
}

async function expectNoNewTransaction(page: Page, idsBefore: string[]): Promise<void> {
    await page.getByRole('link', { name: 'Transactions' }).click();
    expect(await readTransactionIds(page, idsBefore.length)).toEqual(idsBefore);
}

test.describe('Transfer', () => {
    let idsBefore: string[];

    test.beforeEach(async ({ page, request }) => {
        const user = await createUserWithBalance(request, 1000);
        await loginViaApi(page.request, user);
        await page.goto('/transactions');
        await expectBalance(page, 1000);
        idsBefore = await readTransactionIds(page, 1);
        await page.getByRole('link', { name: 'Main', exact: true }).click();
    });

    test('transfer-1: successful transfer decreases balance and creates transaction', async ({ page }) => {
        await submitTransfer(page, { phone: VALID_PHONE, amount: 250, purpose: 'gift' });

        await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();
        await expectBalance(page, 750);

        await page.getByRole('link', { name: 'Transactions' }).click();
        const newRow = await findNewTransactionRow(page, idsBefore);
        await expectTransaction(newRow, { amount: 250, type: 'withdrawal', status: 'completed' });

        await page.reload();
        await expectBalance(page, 750);
        const rowAfterReload = await findNewTransactionRow(page, idsBefore);
        await expectTransaction(rowAfterReload, { amount: 250, type: 'withdrawal', status: 'completed' });
    });

    test('transfer-2: transfer of more than the balance is rejected', async ({ page }) => {
        await submitTransfer(page, { phone: VALID_PHONE, amount: 1001, purpose: 'too much many' });

        await expect(errorMessage(page)).toBeVisible();
        await expectBalance(page, 1000);
        await expectNoNewTransaction(page, idsBefore);
    });

    const invalidPhones = [
        { title: 'without leading +', phone: '79999999999' },
        { title: 'with less than 10 digits', phone: '+7 999 999-99' },
        { title: 'with more than 15 digits', phone: '+7 999 999-99-99-12345' },
    ];
    for (const { title, phone } of invalidPhones) {
        test(`transfer-3: transfer to phone ${title} is not performed`, async ({ page }) => {
            await submitTransfer(page, { phone, amount: 100, purpose: 'invalid phone' });

            await expect(errorMessage(page)).toBeVisible();
            await expectBalance(page, 1000);
            await expectNoNewTransaction(page, idsBefore);
        });
    }

    for (const amount of [0, -100]) {
        test(`transfer-4: transfer amount ${amount} is not performed`, async ({ page }) => {
            await submitTransfer(page, { phone: VALID_PHONE, amount, purpose: 'Invalid amount' });

            await expect(errorMessage(page)).toBeVisible();
            await expectBalance(page, 1000);
            await expectNoNewTransaction(page, idsBefore);
        });
    }
});
