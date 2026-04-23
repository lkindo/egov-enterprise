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
    private String replyAt;
    private Integer replyLc;
    private String useAt;
    private String atchFileId;
    private String ntceBgnde;
    private String ntceEndde;
    private String sjBoldAt;
    private String noticeAt;
    private String secretAt;
    private Integer commentCo; // Integer로 변경
    private LocalDateTime eventDate;
    private String qnaStatus;
    private String qnaCategory;
}
