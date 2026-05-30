const fs = require('fs');

const logFile = 'C:\\Users\\sanle\\.gemini\\antigravity\\brain\\2237cb27-f151-42f7-89bc-53079178b145\\.system_generated\\tasks\\task-1332.log';

if (!fs.existsSync(logFile)) {
    console.log('No log found.');
    process.exit(1);
}

const lines = fs.readFileSync(logFile, 'utf8').split('\n');

const failures = [];
let captureError = false;
let currentFailure = '';
let currentError = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().endsWith('FAILED')) {
        if (currentFailure) {
            failures.push({ test: currentFailure, error: currentError.join('\n') });
        }
        currentFailure = line.trim();
        currentError = [];
        captureError = true;
    } else if (captureError) {
        if (line.trim() === '' || line.startsWith('> Task') || line.trim().endsWith('FAILED') || line.includes('tests completed,')) {
            if (line.trim().endsWith('FAILED')) {
                // Next failure starts
            } else if (line.includes('tests completed,')) {
                captureError = false;
            } else {
                // End of error block usually? Or just keep capturing until blank line
                if (line.trim() === '' && currentError.length > 5) {
                    captureError = false;
                } else if (line.trim() !== '') {
                    currentError.push(line);
                }
            }
        } else {
            currentError.push(line);
        }
    }
}

if (currentFailure) {
    failures.push({ test: currentFailure, error: currentError.join('\n') });
}

console.log(`Found ${failures.length} failed tests in log.`);
const uniqueClasses = new Set();
failures.forEach(f => {
    const className = f.test.split(' > ')[0].trim();
    uniqueClasses.add(className);
});

console.log('\n--- Unique Test Classes with Failures ---');
console.log(Array.from(uniqueClasses).join('\n'));

console.log('\n--- Detailed Failures ---');
failures.forEach(f => {
    console.log(`[TEST]: ${f.test}`);
    console.log(`[ERROR]:\n${f.error.substring(0, 500)}\n`);
});
