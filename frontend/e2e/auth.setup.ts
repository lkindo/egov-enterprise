import { test as setup } from '@playwright/test';
import path from 'node:path';
import { TEST_CREDENTIALS } from './test-credentials';
import { assertIsolatedTarget } from '../../scripts/e2e-isolation.mjs';
import { authenticate } from './fixtures/auth-state.mjs';

const adminFile = path.resolve('playwright/.auth/admin.json');
const userFile = path.resolve('playwright/.auth/user.json');

setup('authenticate-admin', async ({ request }) => {
    await authenticate(request, TEST_CREDENTIALS.admin.id, TEST_CREDENTIALS.admin.password, adminFile, assertIsolatedTarget);
});

setup('authenticate-user', async ({ request }) => {
    await authenticate(request, TEST_CREDENTIALS.user.id, TEST_CREDENTIALS.user.password, userFile, assertIsolatedTarget);
});
