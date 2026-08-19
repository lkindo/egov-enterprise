const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const E2E_PORT = 3001;
const serverUrl = `http://localhost:${E2E_PORT}`;
const frontendDirectory = path.join(__dirname, '..');

function loadE2eEnvironment(logger = console) {
  const envE2ePath = path.join(frontendDirectory, '.env.e2e');
  if (!fs.existsSync(envE2ePath)) return;

  logger.log('📝 Loading environment overrides from .env.e2e...');
  const envContent = fs.readFileSync(envE2ePath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
    const [key, ...valueParts] = trimmed.split('=');
    process.env[key.trim()] = valueParts.join('=').trim();
  });
}

function waitForServer(timeoutMs = 60000, url = serverUrl) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for Next.js server to start.'));
        return;
      }

      http.get(url, (res) => {
        if ([200, 302, 307].includes(res.statusCode)) {
          clearInterval(interval);
          resolve();
        }
        res.resume();
      }).on('error', () => {
        // 아직 뜨지 않은 동안만 재시도한다.
      });
    }, 1000);
  });
}

function stopServer(serverProcess, execute, platform) {
  if (serverProcess.exitCode !== null) return;
  if (platform === 'win32') {
    execute(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
  } else {
    serverProcess.kill('SIGTERM');
  }
}

/**
 * 의존성을 주입할 수 있게 둔 것은 실제 Next 서버를 띄우지 않고도 자식 실패 전파 계약을 검증하기 위해서다.
 */
async function runCoverageWorkflow(dependencies = {}) {
  const execute = dependencies.execute || execSync;
  const spawnProcess = dependencies.spawnProcess || spawn;
  const waitUntilReady = dependencies.waitUntilReady || waitForServer;
  const loadEnvironment = dependencies.loadEnvironment || loadE2eEnvironment;
  const logger = dependencies.logger || console;
  const platform = dependencies.platform || process.platform;

  loadEnvironment(logger);

  logger.log('🧹 Cleaning up old coverage data...');
  execute('npm run coverage:clean', { cwd: frontendDirectory, stdio: 'inherit' });

  logger.log('⚙️ Compiling Next.js with Istanbul Instrumentation...');
  execute('node scripts/build-instrumented.js', { cwd: frontendDirectory, stdio: 'inherit' });

  logger.log(`📡 Starting Next.js Production Server on port ${E2E_PORT}...`);
  const serverProcess = spawnProcess('npx', ['next', 'start', '-p', E2E_PORT.toString()], {
    cwd: frontendDirectory,
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=8192',
    },
  });

  serverProcess.stdout?.on('data', (data) => {
    logger.log(`[Next.js Server]: ${data.toString().trim()}`);
  });
  serverProcess.stderr?.on('data', (data) => {
    logger.error(`[Next.js Server Error]: ${data.toString().trim()}`);
  });

  let primaryFailure = null;
  let shutdownFailure = null;
  let reportFailure = null;

  try {
    await waitUntilReady();
    logger.log('🚀 Server is ready. Starting Playwright E2E Tests...');
    execute('cross-env NODE_OPTIONS=--max-old-space-size=8192 npx playwright test --project=full-suite', {
      cwd: frontendDirectory,
      stdio: 'inherit',
      shell: true,
    });
    logger.log('✅ Playwright E2E tests finished successfully.');
  } catch (error) {
    primaryFailure = error;
    logger.error('❌ E2E run failed:', error instanceof Error ? error.message : String(error));
  } finally {
    logger.log('🛑 Shutting down Next.js Server...');
    try {
      stopServer(serverProcess, execute, platform);
    } catch (error) {
      shutdownFailure = error;
      logger.error('❌ Next.js server shutdown failed:', error instanceof Error ? error.message : String(error));
    }

    logger.log('📊 Merging E2E coverage results...');
    try {
      execute('npm run coverage:report', { cwd: frontendDirectory, stdio: 'inherit' });
    } catch (error) {
      reportFailure = error;
      logger.error('❌ NYC report generation failed:', error instanceof Error ? error.message : String(error));
    }
  }

  const failures = [primaryFailure, shutdownFailure, reportFailure].filter(Boolean);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(failures, 'E2E coverage workflow failed in multiple stages.');
  }
}

if (require.main === module) {
  void runCoverageWorkflow().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  loadE2eEnvironment,
  runCoverageWorkflow,
  waitForServer,
};
