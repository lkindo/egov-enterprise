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
    private Long pstSn;
    private String pstTtl;
    private String frstRgtrId;
    private String userNm;
    private LocalDateTime crtDt;
    private Integer inqCnt;
    private Integer likeCnt;
    private Long upPstSn;
    private String replyYn;
    private Integer ansLv;
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


}
