const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = path.join(__dirname, '..');
const vitestCoverageSrc = path.join(frontendDir, 'coverage/coverage-final.json');
const nycOutputDir = path.join(frontendDir, '.nyc_output');
const vitestCoverageDest = path.join(nycOutputDir, 'vitest-coverage-final.json');

console.log("📊 Starting Coverage Merge Process...");

// 1. Check if Vitest coverage exists
if (!fs.existsSync(vitestCoverageSrc)) {
  console.error("❌ Vitest coverage file not found at:", vitestCoverageSrc);
  console.log("Please run 'npm run test:coverage' first.");
  process.exit(1);
}

// 2. Ensure .nyc_output directory exists
if (!fs.existsSync(nycOutputDir)) {
  fs.mkdirSync(nycOutputDir, { recursive: true });
}

// 3. Copy Vitest coverage to .nyc_output
console.log(`📋 Copying Vitest coverage to .nyc_output...`);
fs.copyFileSync(vitestCoverageSrc, vitestCoverageDest);
console.log(`✅ Vitest coverage copied successfully.`);

// 4. Generate combined report using NYC
console.log("📊 Generating combined HTML and Text reports via NYC...");
try {
  execSync("npx nyc report --reporter=html --reporter=text --reporter=json-summary", {
    cwd: frontendDir,
    stdio: 'inherit'
  });
  console.log("🎉 Combined coverage report generated successfully in /coverage directory.");
} catch (error) {
  console.error("❌ Combined report generation failed:", error.message);
  process.exit(1);
}
