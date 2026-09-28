import { expect, type Locator, type Page } from '@playwright/test';
import type { TestUser } from './api';

export async function loginViaUi(page: Page, user: Pick<TestUser, 'email' | 'password'>): Promise<void> {
    await page.getByPlaceholder('Type your email').fill(user.email);
    await page.getByPlaceholder('Type your password').fill(user.password);
    await page.getByRole('button', { name: 'Login' }).click();
}

export async function logoutViaUi(page: Page): Promise<void> {
    await page.getByRole('navigation').getByRole('button').click();
    await expect(page).toHaveURL('/login');
}

export async function submitTransfer(page: Page, transfer: { phone: string; amount: number; purpose: string }): Promise<void> {
    await page.getByPlaceholder('+7 999 123-45-67').fill(transfer.phone);
    await page.getByPlaceholder('0.00').fill(String(transfer.amount));
    await page.getByPlaceholder('e.g. debt repayment').fill(transfer.purpose);
    await page.getByRole('button', { name: 'Send' }).click();
}

export async function expectBalance(page: Page, expected: number): Promise<void> {
    const balance = page.getByRole('heading', { name: /^Balance:/ });
    await expect.poll(async () => Number((await balance.innerText()).replace('Balance:', ''))).toBe(expected);
}


export function transactionRows(page: Page): Locator {
    return page.locator('tbody').getByRole('row');
}

export async function readTransactionIds(page: Page, expectedCount: number): Promise<string[]> {
    await expect(transactionRows(page)).toHaveCount(expectedCount);
    return page.locator('tbody tr td:first-child').allInnerTexts();
}

export async function findNewTransactionRow(page: Page, idsBefore: string[]): Promise<Locator> {
    const idsAfter = await readTransactionIds(page, idsBefore.length + 1);
    const newIds = idsAfter.filter((id) => !idsBefore.includes(id));
    expect(newIds).toHaveLength(1);
    return transactionRows(page).filter({ hasText: newIds[0] });
}

export async function expectTransaction(
    row: Locator,
    expected: { amount: number; type: 'deposit' | 'withdrawal'; status: 'completed' },): Promise<void> {
    const cells = row.getByRole('cell');
    await expect(cells.nth(0)).toHaveText(/^[0-9a-f-]{36}$/);
    await expect(cells.nth(1)).toHaveText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    await expect(cells.nth(2)).toHaveText(expected.type);
    await expect(cells.nth(3)).toHaveText(expected.status);
    await expect(cells.nth(4)).toHaveText(String(expected.amount));
}
