const fs = require('fs');

const path = 'd:/project/egov-enterprise/frontend/src/app/smart-toolkit/dept-job/selectDeptJobList/page.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<span className="text-foreground font-bold">[^<]+span>/g, '<span className="text-foreground font-bold">부서업무 관리</span>');

fs.writeFileSync(path, c);
console.log('Fixed');
