import { test, expect } from '@playwright/test';
import { generateUser, registerViaApi } from './help_functions/api';
import { loginViaUi } from './help_functions/ui';

test.describe('Authentication', () => {
    test('auth-1: user registration and login', async ({ page }) => {
        const user = generateUser();

        await page.goto('/register');
        await page.getByPlaceholder('Type your name').fill(user.name);
        await page.getByPlaceholder('Type your surname').fill(user.surname);
        await page.getByPlaceholder('Type your email').fill(user.email);
        await page.locator('input[name="Type your password"]').fill(user.password);
        await page.getByRole('button', { name: 'Register' }).click();

        await expect(page).toHaveURL('/login');

        await loginViaUi(page, user);
        await expect(page).toHaveURL('/');

        await page.getByRole('link', { name: 'Profile' }).click();
        await expect(page.getByText(`Name: ${user.name}`, { exact: true })).toBeVisible();
        await expect(page.getByText(`Surname: ${user.surname}`, { exact: true })).toBeVisible();
        await expect(page.getByText(`Email: ${user.email}`, { exact: true })).toBeVisible();
    });

    test('auth-2: login with wrong password', async ({ page, request }) => {
        const user = await registerViaApi(request);

        await page.goto('/login');
        await loginViaUi(page, { email: user.email, password: 'wrong_password' });

        await expect(page.locator('.snackbar.error')).toBeVisible();

        await page.goto('/profile');
        await expect(page).toHaveURL('/login');
    });

    test('auth-3: registration with duplicate email', async ({ page, request }) => {
        const existingUser = await registerViaApi(request);
        const duplicate = { ...generateUser(), email: existingUser.email };

        await page.goto('/register');
        await page.getByPlaceholder('Type your name').fill(duplicate.name);
        await page.getByPlaceholder('Type your surname').fill(duplicate.surname);
        await page.getByPlaceholder('Type your email').fill(duplicate.email);
        await page.locator('input[name="Type your password"]').fill(duplicate.password);
        await page.getByRole('button', { name: 'Register' }).click();

        await expect(page.locator('p.error')).toBeVisible();
        await expect(page).toHaveURL('/register');
    });
});
