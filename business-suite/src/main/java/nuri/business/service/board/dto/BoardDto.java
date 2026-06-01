package nuri.business.service.board.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

/**
 * 게시글 정보 DTO (v5 standardized)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BoardDto {

    @Schema(description = "게시글 ID")
    @Size(max = 20)
    private String pstId;

    @Schema(description = "게시판 ID")
    @Size(max = 20)
    private String bbsId;

    @Schema(description = "답글 번호")
    private Long ansSn;

    @Schema(description = "제목")
    @Size(max = 100)
    private String pstTtl;

    @Schema(description = "내용")
    @Size(max = 4000)
    private String pstCn;

    @Schema(description = "상위 게시글 ID")
    @Size(max = 20)
    private String upPstId;

    @Schema(description = "정렬 순서")
    private Long sortOrdr;

    @Schema(description = "제목 굵게 표시 여부")
    @Size(max = 1)
    private String ttlBoldYn;

    @Schema(description = "조회수")
    private Integer inqCnt;

    @Schema(description = "사용 여부")
    @Size(max = 1)
    @NotBlank
    private String useYn;

    @Schema(description = "게시 시작일")
    @Size(max = 20)
    private String pstBgngYmd;

    @Schema(description = "게시 종료일")
    @Size(max = 20)
    private String pstEndYmd;

    @Schema(description = "작성자 ID")
    @Size(max = 20)
    @NotBlank
    private String userId;

    @Schema(description = "작성자명")
    @Size(max = 100)
    private String userNm;

    @Schema(description = "비밀번호")
    @Size(max = 200)
    private String pswd;

    @Schema(description = "첨부파일 ID")
    @Size(max = 30)
    private String atchFileId;

    @Schema(description = "비밀글 여부")
    @Size(max = 1)
    private String scrtYn;

    @Schema(description = "블로그 ID")
    @Size(max = 20)
    private String blogId;

    @Schema(description = "행사일")
    private LocalDateTime evntDt;

    @Schema(description = "QNA 상태")
    private String qnaSttsCd;

    @Schema(description = "QNA 카테고리")
    @Size(max = 12)
    private String qnaCatCd;

    @Schema(description = "좋아요수")
    private Integer likeCnt;

    @Schema(description = "댓글수")
    private Integer commentCnt;

    @Schema(description = "파일수")
    private Integer fileCnt;

    @Schema(description = "등록일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "등록자명")
    private String frstRegisterNm;

    @Schema(description = "답글 단계")
    private Integer ansLvl;

}
