const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const E2E_PORT = 3001;
const serverUrl = `http://localhost:${E2E_PORT}`;

// Load .env.e2e manually if exists to guarantee variables are injected into spawns
const envE2ePath = path.join(__dirname, '../.env.e2e');
if (fs.existsSync(envE2ePath)) {
  console.log("📝 Loading environment overrides from .env.e2e...");
  const envContent = fs.readFileSync(envE2ePath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const val = valueParts.join('=');
      process.env[key.trim()] = val.trim();
    }
  });
}

// 1. Clean previous coverage records
console.log("🧹 Cleaning up old coverage data...");
try {
  execSync("npm run coverage:clean", { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
} catch (e) {}

// 2. Build instrumented files
console.log("⚙️ Compiling Next.js with Istanbul Instrumentation...");
execSync("node scripts/build-instrumented.js", { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

// 3. Start Next.js server in the background
console.log(`📡 Starting Next.js Production Server on port ${E2E_PORT}...`);
const serverProcess = spawn('npx', ['next', 'start', '-p', E2E_PORT.toString()], {
  cwd: path.join(__dirname, '..'),
  stdio: 'pipe',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    NODE_OPTIONS: '--max-old-space-size=8192'
  }
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[Next.js Server]: ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Next.js Server Error]: ${data.toString().trim()}`);
});

// Port polling to wait for Next.js to wake up
function waitForServer(timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Timeout waiting for Next.js server to start."));
      }

      http.get(serverUrl, (res) => {
        if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 302) {
          clearInterval(interval);
          resolve();
        }
      }).on('error', () => {
        // Keep waiting
      });
    }, 1000);
  });
}

async function main() {
  try {
    await waitForServer();
    console.log("🚀 Server is ready. Starting Playwright E2E Tests...");
    
    // 4. Run Playwright E2E with project filtering to avoid redundant test runs
    execSync("cross-env NODE_OPTIONS=--max-old-space-size=8192 npx playwright test --project=full-suite", {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });
    
    console.log("✅ Playwright E2E tests finished successfully.");
  } catch (error) {
    console.error("❌ E2E run failed:", error.message);
  } finally {
    // 5. Shutdown background server
    console.log("🛑 Shutting down Next.js Server...");
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (e) {}

    // 6. Generate unified report
    console.log("📊 Merging E2E coverage results...");
    try {
      execSync("npm run coverage:report", { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    } catch (e) {
      console.error("❌ NYC report generation failed:", e.message);
    }
  }
}

main();
