package com.company.project.domain.board;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardDetailResult {
    // Board fields
    private String bbsId;
    private Long nttId;
    private String nttSj;
    private String ntcrId;
    private String ntcrNm;
    private Long nttNo;
    private String nttCn;
    private String password;
    private String frstRegisterId;
    private String frstRegisterNm;
    private LocalDateTime createdDate;
    private String ntceBgnde;
    private String ntceEndde;
    private Integer inqireCo;
    private String useAt;
    private String atchFileId;
    private Long parnts;
    private String replyAt;
    private Integer replyLc;
    private Long sortOrdr;
    private String sjBoldAt;
    private String noticeAt;
    private String secretAt;
    private Integer commentCo;

    // BoardMaster fields
    private String bbsTyCode;
    private String replyPosblAt;
    private String fileAtchPosblAt;
    private Integer atchPosblFileNumber;
    private String bbsNm;
}
