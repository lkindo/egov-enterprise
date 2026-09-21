import { assertIsolatedTarget } from '../../../scripts/e2e-isolation.mjs';

export default async function globalSetup() {
  await assertIsolatedTarget();
}
