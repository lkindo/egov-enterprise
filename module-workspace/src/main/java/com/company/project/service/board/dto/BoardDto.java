package com.company.project.service.board.dto;

import com.company.project.domain.board.Board;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
@Schema(description = "Description")
public class BoardDto {
    @Schema(description = "Description")
    private final Long id;

    @Schema(description = "Description")
    private final String bbsId;

    @Schema(description = "Description")
    private final String nttSj;

    @Schema(description = "Description")
    private final String nttCn;

    @Schema(description = "Description")
    private final String ntcrNm;

    @Schema(description = "Description")
    private final Integer inqireCo;

    @Schema(description = "Description")
    private final LocalDateTime frstRegisterPnttm;

    @Schema(description = "Description")
    private final String atchFileId;

    @Schema(description = "Description")
    private final Long nttNo;

    @Schema(description = "Description")
    private final Long sortOrdr;

    @Schema(description = "Description")
    private final String parnts;

    @Schema(description = "Description")
    private final String replyAt;

    @Schema(description = "Description")
    private final Integer replyLc;

    @Schema(description = "Description")
    private final String ntceBgnde;

    @Schema(description = "Description")
    private final String ntceEndde;

    @Schema(description = "Description")
    private final String useAt;

    @Schema(description = "Description")
    private final String isExpired;

    @Schema(description = "Description")
    private final String frstRegisterPnttmStr;

    @Schema(description = "Description")
    private final String ntcrId;

    @Schema(description = "Description")
    private final String frstRegisterId;

    @Schema(description = "Description")
    private final String lastUpdusrId;

    @Schema(description = "Description")
    private final LocalDateTime lastUpdtPnttm;

    @Schema(description = "Description")
    private final String password;

    @Schema(description = "Description")
    private final String secretAt;

    @Schema(description = "Description")
    private final String blogAt;

    @Schema(description = "Description")
    private final Integer commentCo;

    @Schema(description = "Description")
    private final String bbsNm;

    public static BoardDto from(Board entity) {
        // ... (existing from method)
        return BoardDto.builder()
                .id(entity.getNttId())
                .bbsId(entity.getBbsId())
                .nttSj(entity.getNttSj())
                .nttCn(entity.getNttCn())
                .ntcrNm(entity.getNtcrNm())
                .inqireCo(entity.getInqireCo())
                .frstRegisterPnttm(entity.getCreatedDate())
                .atchFileId(entity.getAtchFileId())
                .nttNo(entity.getNttNo())
                .sortOrdr(entity.getSortOrdr())
                .parnts(String.valueOf(entity.getParnts()))
                .replyAt(entity.getReplyAt())
                .replyLc(entity.getReplyLc())
                .ntceBgnde(entity.getNtceBgnde())
                .ntceEndde(entity.getNtceEndde())
                .useAt(entity.getUseAt())
                .isExpired(getExpiredFlag(entity.getNtceEndde()))
                .frstRegisterPnttmStr(entity.getCreatedDate() != null
                        ? entity.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .ntcrId(entity.getNtcrId())
                .frstRegisterId(entity.getCreatedBy())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .password(entity.getPassword())
                .secretAt(entity.getSecretAt())
                .blogAt(entity.getBlogId() != null ? "Y" : "N")
                .commentCo(0)
                .build();
    }

    public static BoardDto from(com.company.project.domain.board.BoardSearchResult result) {
        return BoardDto.builder()
                .id(result.getNttId())
                .bbsId(result.getBbsId())
                .nttSj(result.getNttSj())
                .ntcrNm(result.getFrstRegisterNm())
                .inqireCo(result.getInqireCo())
                .frstRegisterPnttm(result.getCreatedDate())
                .atchFileId(result.getAtchFileId())
                .parnts(String.valueOf(result.getParnts()))
                .replyAt(result.getReplyAt())
                .replyLc(result.getReplyLc())
                .ntceBgnde(result.getNtceBgnde())
                .ntceEndde(result.getNtceEndde())
                .useAt(result.getUseAt())
                .isExpired(getExpiredFlag(result.getNtceEndde()))
                .frstRegisterPnttmStr(result.getCreatedDate() != null
                        ? result.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .frstRegisterId(result.getFrstRegisterId())
                .secretAt(result.getSecretAt())
                .commentCo(result.getCommentCo())
                .build();
    }

    public static BoardDto from(com.company.project.domain.board.BoardDetailResult detail) {
        return BoardDto.builder()
                .id(detail.getNttId())
                .bbsId(detail.getBbsId())
                .nttSj(detail.getNttSj())
                .nttCn(detail.getNttCn())
                .ntcrNm(detail.getFrstRegisterNm())
                .inqireCo(detail.getInqireCo())
                .frstRegisterPnttm(detail.getCreatedDate())
                .atchFileId(detail.getAtchFileId())
                .nttNo(detail.getNttNo())
                .sortOrdr(detail.getSortOrdr())
                .parnts(String.valueOf(detail.getParnts()))
                .replyAt(detail.getReplyAt())
                .replyLc(detail.getReplyLc())
                .ntceBgnde(detail.getNtceBgnde())
                .ntceEndde(detail.getNtceEndde())
                .useAt(detail.getUseAt())
                .isExpired(getExpiredFlag(detail.getNtceEndde()))
                .frstRegisterPnttmStr(detail.getCreatedDate() != null
                        ? detail.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .ntcrId(detail.getNtcrId())
                .frstRegisterId(detail.getFrstRegisterId())
                .password(detail.getPassword())
                .secretAt(detail.getSecretAt())
                .bbsNm(detail.getBbsNm())
                .build();
    }

    private static String getExpiredFlag(String ntceEndde) {
        if (ntceEndde == null || ntceEndde.isEmpty()) return "N";
        String today = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return ntceEndde.compareTo(today) < 0 ? "Y" : "N";
    }

    // Compatibility getters for legacy JSP
    public Long getNttId() {
        return id;
    }

    public String getFrstRegisterNm() {
        return ntcrNm;
    }

    public String getCommentCoLegacy() {
        return "";
    }
}
