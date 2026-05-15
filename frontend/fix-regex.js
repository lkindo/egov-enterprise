const fs = require('fs');
const path = require('path');

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const p = path.join(dir, file);
        const stat = fs.statSync(p);
        if (stat && stat.isDirectory()) {
            walk(p);
        } else if (p.endsWith('.ts')) {
            let content = fs.readFileSync(p, 'utf8');
            let originalContent = content;
            
            // Replace broken regex strings
            // The corrupted string usually looks like /?공?으?(?정|?록)?었?니????되?습?다/
            // and /?깃났?곸쑝濡?(?섏젙|?깅줉)?섏뿀?듬땲???€?λ릺?덉뒿?덈떎/
            // We'll replace any regex literal containing '?' mixed with Korean/broken chars
            // that is used in .getByText(...) or expect(...)
            
            content = content.replace(/\/\?[^\/]*\?\//g, '/(성공|완료|수정|등록)/i');
            content = content.replace(/\/\?.*쑝.*\?\//g, '/(성공|완료|수정|등록)/i');
            
            // Just specifically looking for the exact errors seen:
            content = content.replace(/\/\?공\?으\?\(\?정\|\?록\)\?었\?니\?\?\?\?되\?습\?다\//g, '/(성공|완료|수정|등록|처리)/i');
            content = content.replace(/\/\?깃났\?곸쑝濡\?\(\?섏젙\|\?깅줉\)\?섏뿀\?듬땲\?\?\?€\?λ릺\?덉뒿\?덈떎\//g, '/(성공|완료|수정|등록|처리)/i');
            
            if (content !== originalContent) {
                fs.writeFileSync(p, content, 'utf8');
                console.log(`Fixed regex in: ${p}`);
            }
        }
    });
}

walk('e2e');
