package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 게시판 정보 전송 객체 (DTO)
 * [Security] 비밀번호 필드 외부 노출 차단 (@JsonIgnore)
 */
@Getter
@Builder
@Schema(description = "게시물 정보 DTO")
public class BoardDto {
    @Schema(description = "게시물 ID", example = "1001")
    private final Long pstId;

    @Schema(description = "게시판 ID", example = "BBS_000000000001")
    private final String bbsId;

    @Schema(description = "게시물 제목")
    private final String pstTtl;

    @Schema(description = "게시물 내용")
    private final String pstCn;

    @Schema(description = "작성자 이름")
    private final String ntcrNm;

    @Schema(description = "조회수")
    private final Integer inqireCo;

    @Schema(description = "추천수")
    private final Integer likeCo;

    @Schema(description = "최초 등록 일시")
    private final LocalDateTime frstRegisterPnttm;

    @Schema(description = "첨부파일 ID")
    private final String atchFileId;

    @Schema(description = "게시물 번호")
    private final Long pstSn;

    @Schema(description = "정렬 순서")
    private final Long sortOrdr;

    @Schema(description = "부모 게시물 번호 (답글용)")
    private final String parnts;

    @Schema(description = "답글 여부", example = "N")
    private final String replyYn;

    @Schema(description = "답글 레벨")
    private final Integer replyLc;

    @Schema(description = "게시 시작일")
    private final String ntceBgngYmd;

    @Schema(description = "게시 종료일")
    private final String ntceEndYmd;

    @Schema(description = "사용 여부", example = "Y")
    private final String useYn;

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
    private final String secretYn;

    @Schema(description = "블로그 게시글 여부")
    private final String blogYn;

    @Schema(description = "댓글 수")
    private final Integer commentCnt;

    @Schema(description = "게시판 명")
    private final String bbsTtl;

    @Schema(description = "행사 일시")
    private final LocalDateTime eventDate;

    @Schema(description = "QNA 상태", example = "OPEN")
    private final String qnaStatus;

    @Schema(description = "QNA 카테고리")
    private final String qnaCategory;

    @Schema(description = "공지사항 여부")
    private final String noticeYn;

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

    // Compatibility getters for legacy JSP

    public Long getPstId() {
        return pstId;
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
