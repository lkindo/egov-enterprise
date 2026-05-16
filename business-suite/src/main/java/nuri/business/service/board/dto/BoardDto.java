package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    private Long pstId;

    @Schema(description = "게시판 ID")
    private String bbsId;

    @Schema(description = "답글 번호")
    private Long pstSn;

    @Schema(description = "제목")
    private String pstTtl;

    @Schema(description = "내용")
    private String pstCn;

    @Schema(description = "상위 게시글 ID")
    private Long parnts;

    @Schema(description = "정렬 순서")
    private Long sortOrdr;

    @Schema(description = "제목 굵게 표시 여부")
    private String sjBoldYn;

    @Schema(description = "조회수")
    private Integer inqireCo;

    @Schema(description = "사용 여부")
    private String useYn;

    @Schema(description = "게시 시작일")
    private String ntceBgngYmd;

    @Schema(description = "게시 종료일")
    private String ntceEndYmd;

    @Schema(description = "작성자 ID")
    private String ntcrId;

    @Schema(description = "작성자명")
    private String ntcrNm;

    @Schema(description = "비밀번호")
    private String password;

    @Schema(description = "첨부파일 ID")
    private String atchFileId;

    @Schema(description = "비밀글 여부")
    private String secretYn;

    @Schema(description = "블로그 ID")
    private String blogId;

    @Schema(description = "행사일")
    private LocalDateTime eventDate;

    @Schema(description = "QNA 상태")
    private String qnaStatus;

    @Schema(description = "QNA 카테고리")
    private String qnaCategory;

    @Schema(description = "좋아요수")
    private Integer likeCo;

    @Schema(description = "댓글수")
    private Integer commentCnt;

    @Schema(description = "파일수")
    private Integer fileCnt;

    @Schema(description = "등록일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "등록자명")
    private String frstRegisterNm;

    @Schema(description = "답글 단계")
    private Integer replyLc;

    // --- MapStruct Legacy Fields ---
    private String knoId;
    private String knoNm;
    private String knoCn;
    private String statusCd;
    private String categoryCd;
    private String frstRegisterPnttmStr;
    private String frstRegisterId;
    private LocalDateTime lastUpdtPnttm;
    private String blogYn;
    private String eventDateStr;
    private String isExpired;
    private String bbsTtl;

    // --- Legacy Aliases ---
    public Long getId() { return pstId; }
    public void setId(Long v) { this.pstId = v; }
    public String getNttSj() { return pstTtl; }
    public void setNttSj(String v) { this.pstTtl = v; }
    public String getNttCn() { return pstCn; }
    public void setNttCn(String v) { this.pstCn = v; }
    public Long getNttNo() { return pstSn; }
    public void setNttNo(Long v) { this.pstSn = v; }
    public Integer getCommentCo() { return commentCnt; }
    public void setCommentCo(Integer v) { this.commentCnt = v; }
    public Integer getFileCo() { return fileCnt; }
    public void setFileCo(Integer v) { this.fileCnt = v; }
    public String getUseAt() { return useYn; }
    public void setUseAt(String v) { this.useYn = v; }

    public String getFrstRegisterNm() {
        return ntcrNm != null ? ntcrNm : frstRegisterNm;
    }

    public LocalDateTime getCreatedDate() {
        return frstRegisterPnttm;
    }
}
