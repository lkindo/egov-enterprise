const { spawn } = require('child_process');
const http = require('http');

const runTests = () => {
  console.log('Starting frontend server...');
  const server = spawn('npm', ['run', 'dev', '--', '-p', '3001'], { cwd: 'frontend', shell: true });
  
  let testsStarted = false;

  const checkServer = () => {
    if (testsStarted) return;
    
    http.get('http://127.0.0.1:3001', (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        testsStarted = true;
        console.log('Server is running, starting tests...');
        // ONLY RUN 01-admin-domain.spec.ts
        const tests = spawn('npx', ['playwright', 'test', '01-admin-domain.spec.ts', '--workers=1'], { cwd: 'frontend', shell: true, stdio: 'inherit' });
        
        tests.on('close', (code) => {
          console.log(`Tests finished with code ${code}`);
          server.kill();
          process.exit(code);
        });
      } else {
        setTimeout(checkServer, 2000);
      }
    }).on('error', () => {
      setTimeout(checkServer, 2000);
    });
  };

  setTimeout(checkServer, 3000);
};

runTests();
