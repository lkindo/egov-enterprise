package com.company.project.business.domain.board;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
