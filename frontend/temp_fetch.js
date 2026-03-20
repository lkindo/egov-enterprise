const fs = require('fs');
const auth = JSON.parse(fs.readFileSync('playwright/.auth/admin.json'));
const cookieHeader = auth.cookies.map(c => c.name + '=' + c.value).join('; ');

fetch('http://localhost:3001/admin/system/banner', {
  headers: { 'Cookie': cookieHeader }
}).then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  const titleMatch = text.match(/<title>(.*?)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'no title');
  if (res.status === 500) {
     const errorMatch = text.match(/Error: (.*?)</);
     console.log('Error found in HTML:', errorMatch ? errorMatch[1] : 'not extracted');
     fs.writeFileSync('error_dump.html', text);
  }
}).catch(console.error);
