const fs = require('fs');

let content = fs.readFileSync('business-suite/src/test/java/nuri/business/service/board/BoardMapperTest.java', 'utf8');

content = content.replace(/new BoardSaveRequest\(([^)]+)\)/g, function(match, args) {
    let parts = args.split(',').map(s => s.trim());
    if (parts.length === 15) {
        parts.splice(11, 1);
        return 'new BoardSaveRequest(' + parts.join(', ') + ')';
    }
    return match;
});

fs.writeFileSync('business-suite/src/test/java/nuri/business/service/board/BoardMapperTest.java', content, 'utf8');
console.log('Fixed BoardMapperTest.java');
