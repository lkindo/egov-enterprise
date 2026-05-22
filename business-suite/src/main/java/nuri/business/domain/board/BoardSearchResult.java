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
    private Integer ansLvl;
    private String useYn;
    private String atchFileId;
    private String pstBgngYmd;
    private String pstEndYmd;
    private String ttlBoldYn;
    private String noticeYn;
    private String scrtYn;
    private Integer commentCnt; 
    private LocalDateTime evntDt;
    private String qnaSttsCd;
    private String qnaCatCd;
    private Long ansSn;

    // legacy / aliases
    public String getNttId() { return pstId; }
    public String getNttSj() { return pstTtl; }
    public Long getNttNo() { return ansSn; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public String getParnts() { return upPstId; }
    public String getNtceBgngYmd() { return pstBgngYmd; }
    public String getNtceEndYmd() { return pstEndYmd; }
    public String getSjBoldYn() { return ttlBoldYn; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }

    public String getPstId() { return pstId; }
    public String getPstTtl() { return pstTtl; }
    public Long getPstSn() { return ansSn; }
}
