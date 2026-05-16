const fs = require('fs');
const path = require('path');

const renames = [
    // Faq
    { old: /\.qestnSj\(/g, new: '.qestnTtl(' },
    { old: /\.getQestnSj\(\)/g, new: '.getQestnTtl()' },

    // WorkReport
    { old: /\.reportContent\(/g, new: '.reprtCn(' },
    { old: /\.getReportContent\(\)/g, new: '.getReprtCn()' },
    { old: /\.writerId\(/g, new: '.wrterId(' },
    { old: /\.registerWorkReport\(/g, new: '.createWorkReport(' },

    // Scrap
    { old: /\.getMyScrapList\(/g, new: '.getScrapList(' },

    // Blog
    { old: /\.blogNm\(/g, new: '.blogTtl(' },
    { old: /\.getBlogNm\(\)/g, new: '.getBlogTtl()' },

    // Satisfaction
    { old: /\.articleId\(/g, new: '.pstId(' },
    { old: /\.getArticleId\(\)/g, new: '.getPstId()' },
    { old: /\.satisfactionLevel\(/g, new: '.stsfdgLevel(' },
    { old: /\.getSatisfactionLevel\(\)/g, new: '.getStsfdgLevel()' },

    // Comment
    { old: /\.findByBbsIdAndNttId\(/g, new: '.findByBbsIdAndPstId(' },
    { old: /\.findByCommentCnContaining\(/g, new: '.findByCmntCnContaining(' },

    // Note
    { old: /\.searchSentNotes\(/g, new: '.getSentNotes(' },
    { old: /\.searchReceivedNotes\(/g, new: '.getReceivedNotes(' },
    { old: /\.findByTrnsmiterId\(/g, new: '.findByDsptchUserId(' },

    // Fix BoardMasterService calls in tests (adding userId)
    { old: /boardMasterService\.createBoardMaster\(/g, new: 'boardMasterService.createBoardMaster("user1", ' },
    { old: /boardMasterService\.updateBoardMaster\(/g, new: 'boardMasterService.updateBoardMaster("user1", ' },
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
