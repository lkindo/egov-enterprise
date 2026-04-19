package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import nuri.business.domain.board.Board;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 게시판 정보 전송 객체 (DTO)
 * [Security] 비밀번호 필드 외부 노출 차단 (@JsonIgnore)
 */
@Getter
@Builder
@Schema(description = "게시물 정보 DTO")
public class BoardDto {
    @Schema(description = "게시물 ID", example = "1001")
    private final Long id;

    @Schema(description = "게시판 ID", example = "BBS_000000000001")
    private final String bbsId;

    @Schema(description = "게시물 제목")
    private final String nttSj;

    @Schema(description = "게시물 내용")
    private final String nttCn;

    @Schema(description = "작성자 이름")
    private final String ntcrNm;

    @Schema(description = "조회수")
    private final Integer inqireCo;

    @Schema(description = "최초 등록 일시")
    private final LocalDateTime frstRegisterPnttm;

    @Schema(description = "첨부파일 ID")
    private final String atchFileId;

    @Schema(description = "게시물 번호")
    private final Long nttNo;

    @Schema(description = "정렬 순서")
    private final Long sortOrdr;

    @Schema(description = "부모 게시물 번호 (답글용)")
    private final String parnts;

    @Schema(description = "답글 여부", example = "N")
    private final String replyAt;

    @Schema(description = "답글 레벨")
    private final Integer replyLc;

    @Schema(description = "게시 시작일")
    private final String ntceBgnde;

    @Schema(description = "게시 종료일")
    private final String ntceEndde;

    @Schema(description = "사용 여부", example = "Y")
    private final String useAt;

    @Schema(description = "만료 여부", example = "N")
    private final String isExpired;

    @Schema(description = "최초 등록일 (문자열)")
    private final String frstRegisterPnttmStr;

    @Schema(description = "작성자 ID")
    private final String ntcrId;

    @Schema(description = "최초 등록자 ID")
    private final String frstRegisterId;

    @Schema(description = "최종 수정자 ID")
    private final String lastUpdusrId;

    @Schema(description = "최종 수정 일시")
    private final LocalDateTime lastUpdtPnttm;

    @JsonIgnore // Security Fix
    @Schema(description = "게시물 비밀번호 (노출 방지)", accessMode = Schema.AccessMode.READ_ONLY)
    private final String password;

    @Schema(description = "비밀 게시글 여부")
    private final String secretAt;

    @Schema(description = "블로그 게시글 여부")
    private final String blogAt;

    @Schema(description = "댓글 수")
    private final Integer commentCo;

    @Schema(description = "게시판 명")
    private final String bbsNm;

    @Schema(description = "행사 일시")
    private final LocalDateTime eventDate;

    @Schema(description = "QNA 상태", example = "OPEN")
    private final String qnaStatus;

    @Schema(description = "QNA 카테고리")
    private final String qnaCategory;

    @Schema(description = "공지사항 여부")
    private final String noticeAt;

    @Schema(description = "별칭 ID (레거시 호환)")
    private final String knoId;

    @Schema(description = "별칭 제목 (레거시 호환)")
    private final String knoNm;

    @Schema(description = "별칭 내용 (레거시 호환)")
    private final String knoCn;

    @Schema(description = "별칭 상태코드 (레거시 호환)")
    private final String statusCd;

    @Schema(description = "별칭 카테고리코드 (레거시 호환)")
    private final String categoryCd;

    @Schema(description = "행사 일시 (문자열)")
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
