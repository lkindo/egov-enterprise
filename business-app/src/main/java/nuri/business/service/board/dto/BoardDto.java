package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Builder;
import java.time.LocalDateTime;

/**
 * 게시글 정보 DTO (v5 standardized - Record 버전)
 */
@Builder
public record BoardDto(
    @Schema(description = "게시글 ID")
    Long pstSn,

    @Schema(description = "게시판 ID")
    @Size(max = 20)
    String bbsId,

    @Schema(description = "답글 번호")
    Long ansSn,

    @Schema(description = "제목")
    @Size(max = 100)
    String pstTtl,

    @Schema(description = "내용")
    @Size(max = 4000)
    String pstCn,

    @Schema(description = "상위 게시글 ID")
    Long upPstSn,

    @Schema(description = "정렬 순서")
    Long sortOrdr,

    @Schema(description = "제목 굵게 표시 여부")
    @Size(max = 1)
    String ttlBoldYn,

    @Schema(description = "조회수")
    Integer inqCnt,

    @Schema(description = "사용 여부")
    @Size(max = 1)
    @NotBlank
    String useYn,

    @Schema(description = "게시 시작일")
    @Size(max = 20)
    String pstBgngYmd,

    @Schema(description = "게시 종료일")
    @Size(max = 20)
    String pstEndYmd,

    @Schema(description = "작성자 ID")
    @Size(max = 20)
    @NotBlank
    String userId,

    @Schema(description = "작성자명")
    @Size(max = 100)
    String userNm,

    // [보안] 게시글 비밀번호는 요청(write)으로만 수용, 응답(read)에 직렬화 금지.
    @Schema(description = "비밀번호", accessMode = Schema.AccessMode.WRITE_ONLY)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Size(max = 200)
    String pswd,

    @Schema(description = "첨부파일 일련번호")
    Long atchFileSn,

    @Schema(description = "비밀글 여부")
    @Size(max = 1)
    String scrtYn,

    @Schema(description = "블로그 일련번호")
    Long blogSn,

    @Schema(description = "행사일")
    LocalDateTime evntDt,

    @Schema(description = "QNA 상태")
    String qnaSttsCd,

    @Schema(description = "QNA 카테고리")
    @Size(max = 12)
    String qnaCatCd,

    @Schema(description = "좋아요수")
    Integer likeCnt,

    @Schema(description = "댓글수")
    Integer commentCnt,

    @Schema(description = "파일수")
    Integer fileCnt,

    @Schema(description = "등록일시")
    LocalDateTime crtDt,

    @Schema(description = "등록자명")
    String frstRegisterNm,

    @Schema(description = "답글 단계")
    Integer ansLv
) {
}
