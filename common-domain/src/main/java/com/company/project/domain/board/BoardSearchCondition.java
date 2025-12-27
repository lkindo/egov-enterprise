package com.company.project.domain.board;

import lombok.Data;

@Data
public class BoardSearchCondition {
    private String bbsId;
    private String searchCnd;
    private String searchWrd;
    private String useAt;
    private String frstRegisterId;
}
