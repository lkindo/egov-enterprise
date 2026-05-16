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
    private Long pstId;
    private String pstTtl;
    private String userId;
    private String userNm;
    private Long pstSn;
    private String pstCn;
    private String pswd;
    private String frstRegisterId;
    private String frstRegisterNm;
    private LocalDateTime createdDate;
    private String bgngYmd;
    private String endYmd;
    private Integer inqCnt;
    private Integer likeCnt;
    private String useYn;
    private String atchFileId;
    private Long upPstId;
    private String replyYn;
    private Integer replyLc;
    private Long sortOrdr;
    private String ttlBoldYn;
    private String noticeYn;
    private String secretYn;
    private Integer commentCnt;
    private LocalDateTime eventDate;
    private String qnaSttsCd;
    private String qnaCatCd;

    // BoardMaster fields
    private String bbsTypeCd;
    private String ansPsblYn;
    private String fileAtchPsblYn;
    private Integer atchPsblFileCnt;
    private String bbsTtl;

    // legacy / aliases
    public Long getNttId() { return pstId; }
    public String getNttSj() { return pstTtl; }
    public String getNtcrId() { return userId; }
    public String getNtcrNm() { return userNm; }
    public Long getNttNo() { return pstSn; }
    public String getNttCn() { return pstCn; }
    public String getPassword() { return pswd; }
    public String getNtceBgngYmd() { return bgngYmd; }
    public String getNtceEndYmd() { return endYmd; }
    public Integer getInqireCo() { return inqCnt; }
    public Integer getLikeCo() { return likeCnt; }
    public Long getParnts() { return upPstId; }
    public String getReplyPsblYn() { return ansPsblYn; }
    public String getQnaStatus() { return qnaSttsCd; }
    public String getQnaCategory() { return qnaCatCd; }
    public String getSjBoldYn() { return ttlBoldYn; }

    public Long getPstId() { return pstId; }
    public String getPstTtl() { return pstTtl; }
    public String getPstCn() { return pstCn; }
    public Long getPstSn() { return pstSn; }
}
