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
    private Long nttId;
    private String nttSj;
    private String frstRegisterId;
    private String frstRegisterNm;
    private LocalDateTime createdDate;
    private Integer inqireCo;
    private Integer likeCo;
    private Long parnts;
    private String replyYn;
    private Integer replyLc;
    private String useYn;
    private String atchFileId;
    private String ntceBgngYmd;
    private String ntceEndYmd;
    private String sjBoldYn;
    private String noticeYn;
    private String secretYn;
    private Integer commentCnt; 
    private LocalDateTime eventDate;
    private String qnaStatus;
    private String qnaCategory;
    private Long nttNo;

    // legacy / aliases
    public Long getPstId() { return nttId; }
    public String getPstTtl() { return nttSj; }
    public Long getPstSn() { return nttNo; }
}
