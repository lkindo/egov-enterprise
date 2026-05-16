const fs = require('fs');
const path = require('path');

const renames = [
    // BoardMaster renames
    { old: /\.bbsNm\(/g, new: '.bbsTtl(' },
    { old: /\.bbsTyCode\(/g, new: '.bbsTypeCd(' },
    { old: /\.bbsAttrbCode\(/g, new: '.bbsAttrCd(' },
    { old: /\.tmpltId\(/g, new: '.tmplatId(' },
    { old: /\.bbsIntrcn\(/g, new: '.bbsExpln(' },
    { old: /\.replyPosblAt\(/g, new: '.replyPsblYn(' },
    { old: /\.fileAtchPosblAt\(/g, new: '.fileAtchPsblYn(' },
    { old: /\.atchPosblFileNumber\(/g, new: '.atchPsblFileCnt(' },
    { old: /\.atchPosblFileSize\(/g, new: '.atchPsblFileSize(' },
    { old: /\.commentAt\(/g, new: '.commentYn(' },
    { old: /\.stsfdgAt\(/g, new: '.stsfdgYn(' },
    { old: /\.blogAt\(/g, new: '.blogYn(' },

    // Board (Pst) renames
    { old: /\.nttId\(/g, new: '.pstId(' },
    { old: /\.nttSj\(/g, new: '.pstTtl(' },
    { old: /\.nttCn\(/g, new: '.pstCn(' },
    { old: /\.nttNo\(/g, new: '.pstSn(' },
    { old: /\.commentCo\(/g, new: '.commentCnt(' },
    { old: /\.fileCo\(/g, new: '.fileCnt(' },
    { old: /\.updateCommentCount\(/g, new: 'board.setCommentCnt(' }, // Specialized fix
    { old: /\.updateFileCount\(/g, new: 'board.setFileCnt(' },

    // Community renames
    { old: /\.cmmntyId\(/g, new: '.cmntyId(' },
    { old: /\.cmmntyNm\(/g, new: '.cmntyTtl(' },
    { old: /\.cmmntyIntrcn\(/g, new: '.cmntyIntroCn(' },
    { old: /setCmmntyId\(/g, new: 'setCmntyId(' },
    { old: /setCmmntyNm\(/g, new: 'setCmntyTtl(' },

    // AddressBookUser renames
    { old: /\.emplyrId\(/g, new: '.userId(' },
    { old: /\.emailAdres\(/g, new: '.emlAddr(' },
    { old: /\.moblphonNo\(/g, new: '.mblTelno(' },

    // Report / Schedule renames
    { old: /\.reprtSj\(/g, new: '.reprtTtl(' },
    { old: /\.reportId\(/g, new: '.reprtId(' },
    { old: /\.reportSubject\(/g, new: '.reprtTtl(' },
    { old: /\.reportContents\(/g, new: '.reprtCn(' },
    { old: /\.schdulId\(/g, new: '.schdlId(' },
    { old: /\.scheduleId\(/g, new: '.schdlId(' },
    { old: /\.schdulNm\(/g, new: '.schdlTtl(' },

    // Fix BoardSaveRequest (15 args -> 14 args)
    // This is hard to do with simple regex, I'll do it separately or surgically
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
                console.log('Fixed: ' + fullPath);
            }
        }
    });
}

walk('business-suite/src/test/java');
walk('business-suite/src/main/java');
