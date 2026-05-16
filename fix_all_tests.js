const fs = require('fs');
const path = require('path');

const renames = [
    // User / UserDto (Foundation)
    { old: /\.emailAdres\(/g, new: '.emlAddr(' },
    { old: /\.getEmailAdres\(\)/g, new: '.getEmlAddr()' },
    { old: /\.moblphonNo\(/g, new: '.mblTelno(' },
    { old: /\.getMoblphonNo\(\)/g, new: '.getMblTelno()' },
    { old: /\.offmTelno\(/g, new: '.officeTelno(' },
    { old: /\.getOffmTelno\(\)/g, new: '.getOfficeTelno()' },
    { old: /\.lockAt\(/g, new: '.lckYn(' },
    { old: /\.getLockAt\(\)/g, new: '.getLckYn()' },
    { old: /\.userSttusCode\(/g, new: '.userSttsCd(' },
    { old: /\.getUserSttusCode\(\)/g, new: '.getUserSttsCd()' },
    { old: /\.sexdstnCode\(/g, new: '.gndrCd(' },
    { old: /\.getSexdstnCode\(\)/g, new: '.getGndrCd()' },
    { old: /\.brth\(/g, new: '.brthYmd(' },
    { old: /\.getBrth\(\)/g, new: '.getBrthYmd()' },

    // BoardMaster
    { old: /\.bbsNm\(/g, new: '.bbsTtl(' },
    { old: /\.getBbsNm\(\)/g, new: '.getBbsTtl()' },
    { old: /\.bbsTyCode\(/g, new: '.bbsTypeCd(' },
    { old: /\.getBbsTyCode\(\)/g, new: '.getBbsTypeCd()' },
    { old: /\.bbsAttrbCode\(/g, new: '.bbsAttrCd(' },
    { old: /\.getBbsAttrbCode\(\)/g, new: '.getBbsAttrCd()' },
    { old: /\.replyPosblAt\(/g, new: '.replyPsblYn(' },
    { old: /\.getReplyPosblAt\(\)/g, new: '.getReplyPsblYn()' },
    { old: /\.fileAtchPosblAt\(/g, new: '.fileAtchPsblYn(' },
    { old: /\.getFileAtchPosblAt\(\)/g, new: '.getFileAtchPsblYn()' },
    { old: /\.atchPosblFileNumber\(/g, new: '.atchPsblFileCnt(' },
    { old: /\.getAtchPosblFileNumber\(\)/g, new: '.getAtchPosblFileCnt()' },
    { old: /\.bbsIntrcn\(/g, new: '.bbsExpln(' },
    { old: /\.getBbsIntrcn\(\)/g, new: '.getBbsExpln()' },
    { old: /\.commentAt\(/g, new: '.commentYn(' },
    { old: /\.getCommentAt\(\)/g, new: '.getCommentYn()' },
    { old: /\.stsfdgAt\(/g, new: '.stsfdgYn(' },
    { old: /\.getStsfdgAt\(\)/g, new: '.getStsfdgYn()' },
    { old: /\.tmpltId\(/g, new: '.tmplatId(' },
    { old: /\.getTmpltId\(\)/g, new: '.getTmplatId()' },
    { old: /\.blogAt\(/g, new: '.blogYn(' },
    { old: /\.getBlogAt\(\)/g, new: '.getBlogYn()' },

    // Board (Pst)
    { old: /\.nttId\(/g, new: '.pstId(' },
    { old: /\.getNttId\(\)/g, new: '.getPstId()' },
    { old: /\.nttSj\(/g, new: '.pstTtl(' },
    { old: /\.getNttSj\(\)/g, new: '.getPstTtl()' },
    { old: /\.nttCn\(/g, new: '.pstCn(' },
    { old: /\.getNttCn\(\)/g, new: '.getPstCn()' },
    { old: /\.nttNo\(/g, new: '.pstSn(' },
    { old: /\.getNttNo\(\)/g, new: '.getPstSn()' },
    { old: /\.commentCo\(/g, new: '.commentCnt(' },
    { old: /\.getCommentCo\(\)/g, new: '.getCommentCnt()' },
    { old: /\.fileCo\(/g, new: '.fileCnt(' },
    { old: /\.getFileCo\(\)/g, new: '.getFileCnt()' },
    { old: /\.id\(/g, new: '.pstId(' },
    { old: /\.getId\(\)/g, new: '.getPstId()' },
    { old: /countByBbsIdAndUseAt\(/g, new: 'countByBbsIdAndUseYn(' },
    { old: /sumInqireCoByBbsIdAndUseAt\(/g, new: 'sumInqireCoByBbsIdAndUseYn(' },
    { old: /findTopContributorByBbsIdAndUseAt\(/g, new: 'findTopContributorByBbsIdAndUseYn(' },
    { old: /findMaxNttNo\(/g, new: 'findMaxPstSn(' },

    // Community
    { old: /\.cmmntyId\(/g, new: '.cmntyId(' },
    { old: /\.getCmmntyId\(\)/g, new: '.getCmntyId()' },
    { old: /\.cmmntyNm\(/g, new: '.cmntyTtl(' },
    { old: /\.getCmmntyNm\(\)/g, new: '.getCmntyTtl()' },
    { old: /\.cmmntyIntrcn\(/g, new: '.cmntyIntroCn(' },
    { old: /\.getCmmntyIntrcn\(\)/g, new: '.getCmntyIntroCn()' },

    // AddressBookUser
    { old: /\.emplyrId\(/g, new: '.userId(' },
    { old: /\.getEmplyrId\(\)/g, new: '.getUserId()' },
    { old: /\.emailAdres\(/g, new: '.emlAddr(' },
    { old: /\.moblphonNo\(/g, new: '.mblTelno(' },
    { old: /\.offmTelno\(/g, new: '.officeTelno(' },
    { old: /\.fxnum\(/g, new: '.faxNo(' },
    { old: /\.getFxnum\(\)/g, new: '.getFaxNo()' },

    // Note
    { old: /\.noteTrnsmitId\(/g, new: '.noteDsptchId(' },
    { old: /\.getNoteTrnsmitId\(\)/g, new: '.getNoteDsptchId()' },
    { old: /\.trnsmiterId\(/g, new: '.dsptchUserId(' },
    { old: /\.getTrnsmiterId\(\)/g, new: '.getDsptchUserId()' },

    // WorkReport
    { old: /\.reportId\(/g, new: '.reprtId(' },
    { old: /\.getReportId\(\)/g, new: '.getReprtId()' },
    { old: /\.reportSubject\(/g, new: '.reprtTtl(' },
    { old: /\.getReportSubject\(\)/g, new: '.getReprtTtl()' },
    { old: /\.reportContents\(/g, new: '.reprtCn(' },
    { old: /\.getReportContents\(\)/g, new: '.getReprtCn()' },

    // Schedule
    { old: /\.schdulId\(/g, new: '.schdlId(' },
    { old: /\.getSchdulId\(\)/g, new: '.getSchdlId()' },
    { old: /\.schdulNm\(/g, new: '.schdlTtl(' },
    { old: /\.getSchdulNm\(\)/g, new: '.getSchdlTtl()' },

    // MemoReport
    { old: /\.reprtSj\(/g, new: '.reprtTtl(' },
    { old: /\.getReprtSj\(\)/g, new: '.getReprtTtl()' },

    // Comment
    { old: /\.commentCn\(/g, new: '.cmntCn(' },
    { old: /\.getCommentCn\(\)/g, new: '.getCmntCn()' },
    
    // Miscellaneous
    { old: /nttIdEq\(/g, new: 'pstIdEq(' },
    { old: /bbsIdAndNttIdEq\(/g, new: 'bbsIdAndPstIdEq(' }
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
walk('business-suite/src/main/java'); // Also some main source might need it (e.g. predicates)
