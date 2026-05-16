const fs = require('fs');
const path = require('path');

const renames = [
    // Board
    { old: /private Long nttId;/g, new: 'private Long pstId;' },
    { old: /private String nttSj;/g, new: 'private String pstTtl;' },
    { old: /private String nttCn;/g, new: 'private String pstCn;' },
    { old: /private Long nttNo;/g, new: 'private Long pstSn;' },

    // WorkReport
    { old: /private String reportId;/g, new: 'private String reprtId;' },
    { old: /private String reportSubject;/g, new: 'private String reprtTtl;' },
    { old: /private String reportContents;/g, new: 'private String reprtCn;' },

    // MemoReport
    { old: /private String reportId;/g, new: 'private String reprtId;' },
    { old: /private String reportSubject;/g, new: 'private String reprtTtl;' },
    { old: /private String reportContents;/g, new: 'private String reprtCn;' },
    { old: /private String reportrId;/g, new: 'private String reportrId;' },

    // Restde
    { old: /private String restdeDe;/g, new: 'private String restdeYmd;' },
    { old: /private String restdeDc;/g, new: 'private String restdeExpln;' },
    { old: /private String restdeSeCode;/g, new: 'private String restdeSeCd;' },
];

// Wait, this is getting complicated. I'll just manually fix them.
