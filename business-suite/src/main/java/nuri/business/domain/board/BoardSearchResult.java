package nuri.business.domain.board;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardSearchResult {
    private String bbsId;
    private String pstId;
    private String pstTtl;
    private String frstRegisterId;
    private String frstRegisterNm;
    private LocalDateTime createdDate;
    private Integer inqCnt;
    private Integer likeCnt;
    private String upPstId;
    private String replyYn;
    private Integer replyLc;
    private String useYn;
    private String atchFileId;
    private String bgngYmd;
    private String endYmd;
    private String ttlBoldYn;
    private String noticeYn;
    private String secretYn;
    private Integer commentCnt; 
    private LocalDateTime eventDate;
    private String qnaSttsCd;
    private String qnaCatCd;
    private Long pstSn;

    // legacy / aliases
    public String getNttId() { return pstId; }
    public String getNttSj() { return pstTtl; }
    public Long getNttNo() { return pstSn; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public String getParnts() { return upPstId; }
    public String getNtceBgngYmd() { return bgngYmd; }
    public String getNtceEndYmd() { return endYmd; }
    public String getSjBoldYn() { return ttlBoldYn; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }

    public String getPstId() { return pstId; }
    public String getPstTtl() { return pstTtl; }
    public Long getPstSn() { return pstSn; }
}
