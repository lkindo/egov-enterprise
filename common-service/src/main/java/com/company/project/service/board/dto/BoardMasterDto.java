package com.company.project.service.board.dto;

import com.company.project.domain.board.BoardMaster;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardMasterDto {

    private String bbsId;
    private String bbsNm;
    private String bbsIntrcn;
    private String bbsTyCode;
    private String bbsAttrbCode;
    private String replyPosblAt;
    private String fileAtchPosblAt;
    private Integer atchPosblFileNumber;
    private Long atchPosblFileSize;
    private String tmplatId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;
    private String useAt;
    private String cmmntyId;
    private String blogId;
    private String blogAt;

    // Additional fields for completeness
    private String authFlag;
    private String tmplatCours;

    public static BoardMasterDto from(BoardMaster entity) {
        if (entity == null)
            return null;
        return BoardMasterDto.builder()
                .bbsId(entity.getBbsId())
                .bbsNm(entity.getBbsNm())
                .bbsIntrcn(entity.getBbsIntrcn())
                .bbsTyCode(entity.getBbsTyCode())
                .bbsAttrbCode(entity.getBbsAttrbCode())
                .replyPosblAt(entity.getReplyPosblAt())
                .fileAtchPosblAt(entity.getFileAtchPosblAt())
                .atchPosblFileNumber(entity.getAtchPosblFileNumber())
                .atchPosblFileSize(entity.getAtchPosblFileSize())
                .tmplatId(entity.getTmplatId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .useAt(entity.getUseAt())
                .cmmntyId(entity.getCmmntyId())
                .blogId(entity.getBlogId())
                .blogAt(entity.getBlogAt())
                .build();
    }
}
