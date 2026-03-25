const { spawn } = require('child_process');
const http = require('http');

console.log('Starting frontend server...');
const server = spawn('npm', ['run', 'dev', '--', '-p', '3001'], { cwd: 'frontend', shell: true });

server.stdout.on('data', (data) => console.log(`[Next] ${data}`.trim()));

const checkServer = () => {
  http.get('http://127.0.0.1:3001', (res) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log('Server is running, starting tests...');
      const tests = spawn('npx', ['playwright', 'test'], { cwd: 'frontend', shell: true, stdio: 'inherit' });
      
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

setTimeout(checkServer, 5000);