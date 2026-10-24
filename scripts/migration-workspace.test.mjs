// The existing operational-contracts CI discovers scripts/*.test.mjs.
// Keep this runner's tests beside its source and reuse that execution path.
import '../tools/migration-workspace/store.test.mjs';
import '../tools/migration-workspace/engine.test.mjs';
import '../tools/migration-workspace/inputs.test.mjs';
import '../tools/migration-workspace/ai.test.mjs';
import '../tools/migration-workspace/chat-contract.test.mjs';
import '../tools/migration-workspace/codex-adapter.test.mjs';
import '../tools/migration-workspace/codex-isolation.test.mjs';
import '../tools/migration-workspace/server.test.mjs';
