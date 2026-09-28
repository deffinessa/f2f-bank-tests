import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';


export type TestUser = {
    name: string;
    surname: string;
    email: string;
    password: string;
};

export function generateUser(): TestUser {
    const suffix = randomUUID().slice(0, 8);
    return {
        name: `name_${suffix}`,
        surname: `surname_${suffix}`,
        email: `qa_${suffix}@test.dev`,
        password: `pass_${suffix}`,
    };
}

export async function registerViaApi(api: APIRequestContext): Promise<TestUser> {
    const user = generateUser();
    const response = await api.post('/api/auth/register', { data: user });
    expect(response.status()).toBe(201);
    return user;
}

export async function loginViaApi(api: APIRequestContext, user: TestUser): Promise<void> {
    const response = await api.post('/api/auth/login', {
        data: { email: user.email, password: user.password },
    });
    expect(response.status()).toBe(200);
}

export async function createUserWithBalance(api: APIRequestContext, balance: number): Promise<TestUser> {
    const user = await registerViaApi(api);
    if (balance > 0) {
        await loginViaApi(api, user);
        const response = await api.post('/api/users/balance/add', { data: { amount: balance } });
        expect(response.ok()).toBe(true);
    }
    return user;
}
