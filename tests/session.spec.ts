import { test, expect } from '@playwright/test';
import { createUserWithBalance, loginViaApi } from './help_functions/api';
import { expectBalance, loginViaUi, logoutViaUi, readTransactionIds, transactionRows } from './help_functions/ui';

test.describe('Session', () => {
    test('session-1: after logout protected pages require login again', async ({ page, request }) => {
        const user = await createUserWithBalance(request, 0);
        await loginViaApi(page.request, user);
        await page.goto('/profile');
        await expect(page.getByText(`Email: ${user.email}`, { exact: true })).toBeVisible();

        await logoutViaUi(page);

        for (const path of ['/profile', '/transactions']) {
            await page.goto(path);
            await expect(page).toHaveURL('/login');
        }
    });

    test('session-2: correct balance is shown after login', async ({ page, request }) => {
        const user = await createUserWithBalance(request, 750);

        await page.goto('/login');
        await loginViaUi(page, user);
        await expect(page).toHaveURL('/');
        await expectBalance(page, 750);
    });

    test('session-3: account data is updated after switching users', async ({ page, request }) => {
        const userA = await createUserWithBalance(request, 111);
        const userB = await createUserWithBalance(request, 999);

        await page.goto('/login');
        await loginViaUi(page, userB);
        await page.getByRole('link', { name: 'Profile' }).click();
        await expect(page.getByText(`Email: ${userB.email}`, { exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Transactions' }).click();
        const idsB = await readTransactionIds(page, 1);

        await logoutViaUi(page);
        await loginViaUi(page, userA);
        await expect(page).toHaveURL('/');

        await page.getByRole('link', { name: 'Profile' }).click();
        await expect(page.getByText(`Email: ${userA.email}`, { exact: true })).toBeVisible();
        await expect(page.getByText(`Name: ${userA.name}`, { exact: true })).toBeVisible();
        await expect(page.getByText(userB.email)).toBeHidden();

        await page.getByRole('link', { name: 'Transactions' }).click();
        const idsA = await readTransactionIds(page, 1);
        expect(idsA).not.toEqual(idsB);
        await expect(transactionRows(page).first().getByRole('cell').last()).toHaveText('111');
        await expectBalance(page, 111);
    });
});
