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
    private Long pstSn;
    private String pstTtl;
    private String userId;
    private String userNm;
    private Long ansSn;
    private String pstCn;
    private String pswd;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String pstBgngYmd;
    private String pstEndYmd;
    private Integer inqCnt;
    private Integer likeCnt;
    private String useYn;
    private Long atchFileSn;
    private Long upPstSn;
    private String replyYn;
    private Integer ansLv;
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


}
