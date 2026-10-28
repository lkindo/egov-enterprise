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
    /** 게시글 버전(낙관적 잠금) — 수정 요청이 돌려보낸다(2026-10-23 ADR-0040 결정 10). */
    private Integer version;
    /** 상단 고정 표시(ADR-0040 결정 5). 서비스가 기준일로 '지금 고정 중' 을 판정한다 — 응답에 그대로 싣지 않는다. */
    private String upendFixYn;
    /** 상단 고정 종료일(yyyyMMdd). 고정 중일 때만 응답에 싣는다. */
    private String upendFixEndYmd;

    // BoardMaster fields
    private String bbsTypeCd;
    private String ansPsbltyYn;
    private String fileAtchPsbltyYn;
    private Integer atchPsbltyFileQty;
    private String bbsTtl;

    /**
     * 비밀글 여부. 저장값이 비어 있으면(NULL) {@code 'N'} 이다 — {@link BoardSearchResult#getScrtYn()} 과 같은 규칙이다. 상세·댓글·
     * 답글의 비밀글 판정({@code "Y".equalsIgnoreCase})도 이 값을 읽지만 NULL 과 'N' 은 둘 다 비밀글이 아니라 판정이 같다.
     */
    public String getScrtYn() {
        return scrtYn != null ? scrtYn : "N";
    }
}
