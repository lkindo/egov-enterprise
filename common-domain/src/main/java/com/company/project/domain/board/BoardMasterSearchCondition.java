package com.company.project.domain.board;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BoardMasterSearchCondition {
    private String useAt;
    private String searchCnd; // 0: BBS_NM, 1: BBS_TY_CODE_NM
    private String searchWrd;
    private String trgetId;
    private boolean notUsedOnly;
}