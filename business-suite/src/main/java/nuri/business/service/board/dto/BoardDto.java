package nuri.business.service.board.dto;

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
    private String pstId;

    @Schema(description = "게시판 ID")
    private String bbsId;

    @Schema(description = "답글 번호")
    private Long pstSn;

    @Schema(description = "제목")
    private String pstTtl;

    @Schema(description = "내용")
    private String pstCn;

    @Schema(description = "상위 게시글 ID")
    private String upPstId;

    @Schema(description = "정렬 순서")
    private Long sortOrdr;

    @Schema(description = "제목 굵게 표시 여부")
    private String ttlBoldYn;

    @Schema(description = "조회수")
    private Integer inqCnt;

    @Schema(description = "사용 여부")
    private String useYn;

    @Schema(description = "게시 시작일")
    private String bgngYmd;

    @Schema(description = "게시 종료일")
    private String endYmd;

    @Schema(description = "작성자 ID")
    private String userId;

    @Schema(description = "작성자명")
    private String userNm;

    @Schema(description = "비밀번호")
    private String pswd;

    @Schema(description = "첨부파일 ID")
    private String atchFileId;

    @Schema(description = "비밀글 여부")
    private String secretYn;

    @Schema(description = "블로그 ID")
    private String blogId;

    @Schema(description = "행사일")
    private LocalDateTime eventDate;

    @Schema(description = "QNA 상태")
    private String qnaSttsCd;

    @Schema(description = "QNA 카테고리")
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
    public String getId() { return pstId; }
    public void setId(String v) { this.pstId = v; }
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
    
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }

    public String getFrstRegisterNm() {
        return userNm != null ? userNm : frstRegisterNm;
    }

    public LocalDateTime getCreatedDate() {
        return frstRegisterPnttm;
    }

    public String getNtcrId() { return userId; }
    public String getNtcrNm() { return userNm; }
    public String getPassword() { return pswd; }
    public String getNtceBgngYmd() { return bgngYmd; }
    public String getNtceEndYmd() { return endYmd; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }
    public String getSjBoldYn() { return ttlBoldYn; }
    public String getParnts() { return upPstId; }

    public void setNtcrId(String v) { this.userId = v; }
    public void setNtcrNm(String v) { this.userNm = v; }
    public void setPassword(String v) { this.pswd = v; }
    public void setNtceBgngYmd(String v) { this.bgngYmd = v; }
    public void setNtceEndYmd(String v) { this.endYmd = v; }
    public void setInqireCo(Integer v) { this.inqCnt = v; }
    public void setLikeCo(Integer v) { this.likeCnt = v; }
    public void setQnaStatus(String v) { this.qnaSttsCd = v; }
    public void setQnaCategory(String v) { this.qnaCatCd = v; }
    public void setSjBoldYn(String v) { this.ttlBoldYn = v; }
    public void setParnts(String v) { this.upPstId = v; }

    public abstract static class BoardDtoBuilder<C extends BoardDto, B extends BoardDtoBuilder<C, B>> {
        public B nttId(String nttId) { this.pstId = nttId; return self(); }
        public B nttSj(String nttSj) { this.pstTtl = nttSj; return self(); }
        public B nttCn(String nttCn) { this.pstCn = nttCn; return self(); }
        public B nttNo(Long nttNo) { this.pstSn = nttNo; return self(); }
        public B id(String id) { this.pstId = id; return self(); }
        public B ntcrId(String ntcrId) { this.userId = ntcrId; return self(); }
        public B ntcrNm(String ntcrNm) { this.userNm = ntcrNm; return self(); }
        public B password(String password) { this.pswd = password; return self(); }
        public B inqireCo(Integer inqireCo) { this.inqCnt = inqireCo; return self(); }
        public B likeCo(Integer likeCo) { this.likeCnt = likeCo; return self(); }
        public B qnaStatus(String qnaStatus) { this.qnaSttsCd = qnaStatus; return self(); }
        public B qnaCategory(String qnaCategory) { this.qnaCatCd = qnaCategory; return self(); }
    }
}
