const fs = require('fs');

let content = fs.readFileSync('business-suite/src/test/java/nuri/business/service/board/BoardServiceTest.java', 'utf8');

// Match: new BoardSaveRequest(..., null, null, null, "Y", null, null, null)
// replace with: new BoardSaveRequest(..., null, null, null)
// Actually, it's easier to just match the pattern of 15 args and replace with 14.

// Example:
// new BoardSaveRequest("BBS_01", "Subject", "Content", null, null, null, null, null, null, null, null, "Y", null, null, null)
// -> 15 arguments.
// Standard BoardSaveRequest has 14 arguments.

// I'll just manually rewrite the problematic lines if they are few.
// But there are many.

content = content.replace(/new BoardSaveRequest\(([^)]+)\)/g, function(match, args) {
    let parts = args.split(',').map(s => s.trim());
    if (parts.length === 15) {
        // Remove the 12th argument (usually "Y") or whatever makes it 14.
        parts.splice(11, 1);
        return 'new BoardSaveRequest(' + parts.join(', ') + ')';
    }
    return match;
});

fs.writeFileSync('business-suite/src/test/java/nuri/business/service/board/BoardServiceTest.java', content, 'utf8');
console.log('Fixed BoardServiceTest.java');
