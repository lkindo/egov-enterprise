import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from '@playwright/test';
import { authenticate } from '../e2e/fixtures/auth-state.mjs';
import { TEST_CREDENTIALS } from '../e2e/synthetic-test-credentials.mjs';
import { verifyBaselineAuthenticationTarget } from '../../scripts/ui-quality-baseline-launch.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** API-only authentication: no Playwright project discovery or general E2E teardown. */
export async function authenticateBaseline({
  environment = process.env,
  root = repositoryRoot,
} = {}, {
  executeCommand,
  createRequestContext = () => request.newContext({ storageState: { cookies: [], origins: [] }, maxRedirects: 0 }),
} = {}) {
  const verifyTarget = () => verifyBaselineAuthenticationTarget(environment, {
    repositoryRoot: root, executeCommand,
  });
  // Verify before creating a request client, and again before each account authentication.
  verifyTarget();
  const id = environment.UI_BASELINE_ADMIN_ID;
  const secret = environment.UI_BASELINE_ADMIN_SECRET;
  if (typeof id !== 'string' || !id || typeof secret !== 'string' || !secret) {
    throw new Error('baseline authentication credentials are missing');
  }
  const context = await createRequestContext();
  const authDirectory = path.join(root, 'frontend', 'playwright', '.auth');
  try {
    await authenticate(context, id, secret, path.join(authDirectory, 'admin.json'), verifyTarget);
    await authenticate(context, TEST_CREDENTIALS.user.id, TEST_CREDENTIALS.user.password,
      path.join(authDirectory, 'user.json'), verifyTarget);
  } finally {
    await context.dispose();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  authenticateBaseline().catch(() => {
    console.error('Baseline authentication failed; storage state was not authorized for baseline execution.');
    process.exitCode = 1;
  });
}
