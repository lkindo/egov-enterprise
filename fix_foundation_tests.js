const fs = require('fs');
const path = require('path');

const renames = [
    // LoginPolicy / LoginPolicyDto
    { old: /\.emplyrId\(/g, new: '.userId(' },
    { old: /\.emplyrNm\(/g, new: '.userNm(' },
    { old: /\.ipInfo\(/g, new: '.ipAddr(' },
    { old: /\.dplctPermAt\(/g, new: '.dpcnPrmYn(' },
    { old: /\.lmttAt\(/g, new: '.lmtYn(' },
    { old: /\.startTime\(/g, new: '.bgngTm(' },
    { old: /\.endTime\(/g, new: '.endTm(' },
    { old: /\.otpEnabledAt\(/g, new: '.otpUseYn(' },
    { old: /\.setEmplyrId\(/g, new: '.setUserId(' },
    { old: /\.setEmplyrNm\(/g, new: '.setUserNm(' },
    { old: /\.setIpInfo\(/g, new: '.setIpAddr(' },
    { old: /\.setDplctPermAt\(/g, new: '.setDpcnPrmYn(' },
    { old: /\.setLmttAt\(/g, new: '.setLmtYn(' },
    { old: /\.setStartTime\(/g, new: '.setBgngTm(' },
    { old: /\.setEndTime\(/g, new: '.setEndTm(' },
    { old: /\.setOtpEnabledAt\(/g, new: '.setOtpUseYn(' },
    { old: /\.getEmplyrId\(\)/g, new: '.getUserId()' },
    { old: /\.getIpInfo\(\)/g, new: '.getIpAddr()' },
    { old: /\.getLmttAt\(\)/g, new: '.getLmtYn()' },
    { old: /\.loginPolicyRepository\.search\(/g, new: 'loginPolicyRepository.searchLoginPolicies(' },

    // Revert Menu / CommunityUser / CustomUserDetails / InstitutionCodeRecptnLog
    { old: /\.pstId\(/g, new: '.id(' },
    { old: /\.lckYn\(/g, new: '.lockAt(' },
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

walk('foundation/src/test/java');
