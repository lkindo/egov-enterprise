package nuri.business.service.board.dto;

import nuri.business.domain.board.Board;
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

    @Schema(description = "Description")
    private final LocalDateTime eventDate;

    @Schema(description = "Description")
    private final String qnaStatus;

    @Schema(description = "Description")
    private final String qnaCategory;

    @Schema(description = "Description")
    private final String noticeAt;

    @Schema(description = "Aliased Knowledge ID")
    private final String knoId;

    @Schema(description = "Aliased Knowledge Name")
    private final String knoNm;

    @Schema(description = "Aliased Knowledge Content")
    private final String knoCn;

    @Schema(description = "Aliased Status Code")
    private final String statusCd;

    @Schema(description = "Aliased Category Code")
    private final String categoryCd;

    @Schema(description = "Formatted Event Date String")
    private final String eventDateStr;

    public static BoardDto from(Board entity) {
        String eventDateStr = entity.getEventDate() != null
                ? entity.getEventDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "";
        return BoardDto.builder()
                .id(entity.getNttId())
                .knoId(String.valueOf(entity.getNttId()))
                .knoNm(entity.getNttSj())
                .knoCn(entity.getNttCn())
                .statusCd(entity.getQnaStatus())
                .categoryCd(entity.getQnaCategory())
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
                .eventDate(entity.getEventDate())
                .qnaStatus(entity.getQnaStatus())
                .qnaCategory(entity.getQnaCategory())
                .eventDateStr(eventDateStr)
                .noticeAt(entity.getNoticeAt())
                .build();
    }

    public static BoardDto from(nuri.business.domain.board.BoardSearchResult result) {
        return BoardDto.builder()
                .id(result.getNttId())
                .knoId(String.valueOf(result.getNttId()))
                .knoNm(result.getNttSj())
                .statusCd(result.getQnaStatus())
                .categoryCd(result.getQnaCategory())
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
                .eventDate(result.getEventDate())
                .qnaStatus(result.getQnaStatus())
                .qnaCategory(result.getQnaCategory())
                .eventDateStr(result.getEventDate() != null
                        ? result.getEventDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        : "")
                .noticeAt(result.getNoticeAt())
                .build();
    }

    public static BoardDto from(nuri.business.domain.board.BoardDetailResult detail) {
        return BoardDto.builder()
                .id(detail.getNttId())
                .knoId(String.valueOf(detail.getNttId()))
                .knoNm(detail.getNttSj())
                .knoCn(detail.getNttCn())
                .statusCd(detail.getQnaStatus())
                .categoryCd(detail.getQnaCategory())
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
                .eventDate(detail.getEventDate())
                .qnaStatus(detail.getQnaStatus())
                .qnaCategory(detail.getQnaCategory())
                .eventDateStr(detail.getEventDate() != null
                        ? detail.getEventDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        : "")
                .noticeAt(detail.getNoticeAt())
                .build();
    }

    private static String getExpiredFlag(String ntceEndde) {
        if (ntceEndde == null || ntceEndde.isEmpty())
            return "N";
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

    public LocalDateTime getCreatedDate() {
        return frstRegisterPnttm;
    }

    public String getCommentCoLegacy() {
        return "";
    }
}
