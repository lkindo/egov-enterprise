const fs = require('fs');
const path = require('path');

const renames = [
    { old: /\.pollNm\(/g, new: '.pollTtl(' },
    { old: /\.getPollNm\(/g, new: '.getPollTtl(' },
    { old: /\.pollBeginDe\(/g, new: '.pollBgngYmd(' },
    { old: /\.getPollBeginDe\(/g, new: '.getPollBgngYmd(' },
    { old: /\.pollEndDe\(/g, new: '.pollEndYmd(' },
    { old: /\.getPollEndDe\(/g, new: '.getPollEndYmd(' },
    { old: /\.cmmntyId\(/g, new: '.cmntyId(' },
    { old: /\.getCmmntyId\(/g, new: '.getCmntyId(' },
    { old: /\.cmmntyNm\(/g, new: '.cmntyTtl(' },
    { old: /\.getCmmntyNm\(/g, new: '.getCmntyTtl(' },
    { old: /\.cmmntyIntrcn\(/g, new: '.cmntyIntroCn(' },
    { old: /\.getCmmntyIntrcn\(/g, new: '.getCmntyIntroCn(' },
    { old: /\.requstId\(/g, new: '.dmndId(' },
    { old: /\.getRequstId\(/g, new: '.getDmndId(' },
    { old: /\.occrrncDe\(/g, new: '.ocrnYmd(' },
    { old: /\.getOccrrncDe\(/g, new: '.getOcrnYmd(' },
    { old: /\.rqesterId\(/g, new: '.dmndUserId(' },
    { old: /\.getRqesterId\(/g, new: '.getDmndUserId(' },
    { old: /\.upperMenuNo\(/g, new: '.upperMenuSn(' },
    { old: /\.getUpperMenuNo\(/g, new: '.getUpperMenuSn(' },
    { old: /\.menuDc\(/g, new: '.menuExpln(' },
    { old: /\.getMenuDc\(/g, new: '.getMenuExpln(' },
    { old: /\.pageNm\(/g, new: '.pageTtl(' },
    { old: /\.getPageNm\(/g, new: '.getPageTtl(' },
    { old: /\.pageDc\(/g, new: '.pageExpln(' },
    { old: /\.getPageDc\(/g, new: '.getPageExpln(' },
    { old: /\.qustnrId\(/g, new: '.srvyId(' },
    { old: /\.getQustnrId\(/g, new: '.getSrvyId(' },
    { old: /\.qustnrSj\(/g, new: '.srvyTtl(' },
    { old: /\.getQustnrSj\(/g, new: '.getSrvyTtl(' },
    { old: /\.qustnrBgnde\(/g, new: '.srvyBgngYmd(' },
    { old: /\.getQustnrBgnde\(/g, new: '.getSrvyBgngYmd(' },
    { old: /\.qustnrEndde\(/g, new: '.srvyEndYmd(' },
    { old: /\.getQustnrEndde\(/g, new: '.getSrvyEndYmd(' },
    { old: /\.creatDt\(/g, new: '.crtDt(' },
    { old: /\.getCreatDt\(/g, new: '.getCrtDt(' },
    { old: /\.qestnrRespondId\(/g, new: '.srvyRspdId(' },
    { old: /\.getQestnrRespondId\(/g, new: '.getSrvyRspdId(' },
    { old: /\.respondNm\(/g, new: '.rspdNm(' },
    { old: /\.getRespondNm\(/g, new: '.getRspdNm(' }
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
