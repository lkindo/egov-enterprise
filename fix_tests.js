const fs = require('fs');
const path = require('path');

const renames = [
    { old: /\.getInstitutionCodeList\(/g, new: '.selectInstitutionCodeList(' },
    { old: /\.getInstitutionCodeDetail\(/g, new: '.selectInstitutionCodeDetail(' },
    { old: /\.getInstitutionCodeRecptnList\(/g, new: '.selectInstitutionCodeRecptnList(' },
    { old: /\.processInstitutionCodeRecptn\(/g, new: '.updateInstitutionCodeRecptn(' },
    { old: /\.selectLoginLog\(/g, new: '.selectLoginLogDetail(' },
    { old: /\.selectSysLog\(/g, new: '.selectSysLogDetail(' },
    { old: /\.insertSysLog\(/g, new: '.logInsertSysLog(' },
    { old: /\.insertLoginLog\(/g, new: '.logInsertLoginLog(' },
    { old: /\.crtDt\(/g, new: '.createdDate(' },
    { old: /\.getPollNm\(/g, new: '.getPollTtl(' },
    { old: /\.pollNm\(/g, new: '.pollTtl(' },
    { old: /\.qustnrBeginDe\(/g, new: '.srvyBgngYmd(' },
    { old: /\.qustnrEndDe\(/g, new: '.srvyEndYmd(' },
    { old: /\.findByPollNmContaining\(/g, new: '.findByPollTtlContaining(' },
    { old: /\.findByRespondNmContaining\(/g, new: '.findByRspdNmContaining(' },
    { old: /\.findByQustnrTmplatTyContaining\(/g, new: '.findBySrvyTmplatTypeCdContaining(' },
    { old: /\.findByQustnrIdOrderByQestnSnAsc\(/g, new: '.findBySrvyIdOrderBySrvyQitemSnAsc(' },
    { old: /\.findByQustnrQesitmIdOrderByIemSnAsc\(/g, new: '.findBySrvyQitemIdOrderBySrvyItemSnAsc(' },
    { old: /\.findAllByOrderByUpperMenuNoAscMenuOrdrAsc\(/g, new: '.findAllByOrderByUpperMenuSnAscMenuOrdrAsc(' },
    { old: /\.processSeCode\(/g, new: '.prcsSeCd(' },
    { old: /\.requstId\(/g, new: '.dmndId(' },
    { old: /\.setRequstId\(/g, new: '.setDmndId(' },
    { old: /\.getRequstId\(/g, new: '.getDmndId(' },
    { old: /\.getUseAt\(/g, new: '.getUseYn(' },
    { old: /\.setUseAt\(/g, new: '.setUseYn(' }
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.java')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const rename of renames) {
                if (rename.old.test(content)) {
                    content = content.replace(rename.old, rename.new);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated: ' + fullPath);
            }
        }
    });
}

walk('foundation/src/test/java');
walk('business-suite/src/test/java');
walk('foundation/src/main/java/nuri/foundation/domain'); // Also check repositories
