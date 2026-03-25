const fs = require('fs');

const logOutput = fs.readFileSync('C:\\Users\\lkind\\.gemini\\tmp\\egov-enterprise\\tool-outputs\\session-38e26dce-a553-4653-9bf1-3182a8cc9872\\run_shell_command_1774412252037_0.txt', 'utf8');

const errors = [];
const lines = logOutput.split('\n');
let currentError = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^\s*\d+\)\s+\[.*\]\s+›/)) {
        if (currentError) errors.push(currentError);
        currentError = { test: line.trim(), message: '', locator: '' };
    } else if (currentError) {
        if (line.includes('Error: expect(locator)') || line.includes('Error: expect(received)')) {
            currentError.message = line.trim();
        } else if (line.includes('Locator:')) {
            currentError.locator = line.trim();
        }
    }
}
if (currentError) errors.push(currentError);

console.log("Found " + errors.length + " distinct errors.");
errors.forEach(e => {
  if (e.locator) console.log(e.test + "\n  " + e.locator + "\n");
});
