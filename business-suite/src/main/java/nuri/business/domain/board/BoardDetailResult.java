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
    private String ntcrId;
    private String ntcrNm;
    private Long pstSn;
    private String pstCn;
    private String password;
    private String frstRegisterId;
    private String frstRegisterNm;
    private LocalDateTime createdDate;
    private String ntceBgnyYmd;
    private String ntceEndYmd;
    private Integer inqireCo;
    private Integer likeCo;
    private String useYn;
    private String atchFileId;
    private Long parnts;
    private String replyYn;
    private Integer replyLc;
    private Long sortOrdr;
    private String sjBoldYn;
    private String noticeYn;
    private String secretYn;
    private Integer commentCo;
    private LocalDateTime eventDate;
    private String qnaStatus;
    private String qnaCategory;

    // BoardMaster fields
    private String bbsTypeCd;
    private String replyPsblYn;
    private String fileAtchPsblYn;
    private Integer atchPsblFileCnt;
    private String bbsTtl;
}
