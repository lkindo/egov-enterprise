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
    private String frstRgtrId;
    private String frstRegisterNm;
    private LocalDateTime crtDt;
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


    public String getPstId() { return pstId; }
    public String getPstTtl() { return pstTtl; }
    public Long getPstSn() { return ansSn; }
}
