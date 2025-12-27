package com.company.project.domain.board;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BoardMasterSearchResult {
    private String bbsId;
    private String bbsTyCode;
    private String bbsTyCodeNm;
    private String bbsAttrbCode;
    private String bbsAttrbCodeNm;
    private String bbsNm;
    private String tmplatId;
    private String useAt;
    private LocalDateTime createdDate;
}
