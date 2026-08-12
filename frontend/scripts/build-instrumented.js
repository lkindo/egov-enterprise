const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextDir = path.join(__dirname, '../.next');
console.log("🧹 Purging old Next.js build cache...");
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}

const babelrcPath = path.join(__dirname, '../.babelrc');
const babelrcContent = JSON.stringify({
  presets: ["next/babel"],
  plugins: [
    ["istanbul", {
      exclude: [
        "**/*.spec.ts",
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "node_modules/**",
        ".next/**",
        "e2e/**",
        "src/app/layout.tsx",
        "src/proxy.ts",
        "src/services/**",
        "src/lib/api/**"
      ]
    }]
  ]
}, null, 2);

console.log("🚀 Creating temporary .babelrc for instrumented build...");
fs.writeFileSync(babelrcPath, babelrcContent, 'utf8');

try {
  console.log("⚙️ Running next build with Babel Instrumentation...");
  execSync("npx next build", {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_COVERAGE: 'true',
      NODE_OPTIONS: '--max-old-space-size=8192'
    }
  });
  console.log("✅ Instrumented build completed successfully.");
} catch (error) {
  console.error("❌ Instrumented build failed:", error.message);
  process.exit(1);
} finally {
  console.log("🧹 Cleaning up temporary .babelrc...");
  if (fs.existsSync(babelrcPath)) {
    fs.unlinkSync(babelrcPath);
  }
}
