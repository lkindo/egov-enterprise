package com.company.project.domain.board;

import lombok.Data;
import org.springframework.lang.NonNull;

@Data
public class BoardSearchCondition {
    @NonNull
    private String bbsId;
    private String searchCnd;
    private String searchWrd;
    private String useAt;
    private String frstRegisterId;

    // Default constructor for cases where full initialization isn't needed
    // immediately
    public BoardSearchCondition() {
        this.bbsId = "";
    }

    public BoardSearchCondition(@NonNull String bbsId) {
        this.bbsId = bbsId;
    }
}
