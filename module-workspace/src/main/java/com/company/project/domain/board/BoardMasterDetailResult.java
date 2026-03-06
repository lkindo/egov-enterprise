package com.company.project.domain.board;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BoardMasterDetailResult {
    private String bbsId;
    private String bbsTyCode;
    private String bbsTyCodeNm;
    private String bbsIntrcn;
    private String bbsAttrbCode;
    private String bbsAttrbCodeNm;
    private String bbsNm;
    private String tmplatId;
    private String tmplatNm;
    private String tmplatCours;
    private String fileAtchPosblAt;
    private Integer atchPosblFileNumber;
    private Long atchPosblFileSize;
    private String replyPosblAt;
    private String frstRegisterId;
    private String frstRegisterNm;
    private String useAt;
    private LocalDateTime createdDate;
    private String authFlag;
}
