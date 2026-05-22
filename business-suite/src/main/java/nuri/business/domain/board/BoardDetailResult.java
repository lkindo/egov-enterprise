package nuri.business.domain.board;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardDetailResult {
    // Board fields
    private String bbsId;
    private String pstId;
    private String pstTtl;
    private String userId;
    private String userNm;
    private Long ansSn;
    private String pstCn;
    private String pswd;
    private String frstRegisterId;
    private String frstRegisterNm;
    private LocalDateTime createdDate;
    private String pstBgngYmd;
    private String pstEndYmd;
    private Integer inqCnt;
    private Integer likeCnt;
    private String useYn;
    private String atchFileId;
    private String upPstId;
    private String replyYn;
    private Integer ansLvl;
    private Long sortOrdr;
    private String ttlBoldYn;
    private String noticeYn;
    private String scrtYn;
    private Integer commentCnt;
    private LocalDateTime evntDt;
    private String qnaSttsCd;
    private String qnaCatCd;

    // BoardMaster fields
    private String bbsTypeCd;
    private String ansPsbltyYn;
    private String fileAtchPsbltyYn;
    private Integer atchPsbltyFileQty;
    private String bbsTtl;

    // legacy / aliases
    public String getNttId() { return pstId; }
    public String getNttSj() { return pstTtl; }
    public String getNtcrId() { return userId; }
    public String getNtcrNm() { return userNm; }
    public Long getNttNo() { return ansSn; }
    public String getNttCn() { return pstCn; }
    public String getPassword() { return pswd; }
    public String getNtceBgngYmd() { return pstBgngYmd; }
    public String getNtceEndYmd() { return pstEndYmd; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public String getParnts() { return upPstId; }
    public String getReplyPsblYn() { return ansPsbltyYn; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }
    public String getSjBoldYn() { return ttlBoldYn; }

    public String getPstId() { return pstId; }
    public String getPstTtl() { return pstTtl; }
    public String getPstCn() { return pstCn; }
    public Long getPstSn() { return ansSn; }
}
