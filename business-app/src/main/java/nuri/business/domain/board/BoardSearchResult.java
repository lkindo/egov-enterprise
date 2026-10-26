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
    private Long atchFileSn;
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
    /** 게시글 버전(낙관적 잠금) — 수정 요청이 돌려보낸다(2026-10-23 ADR-0040 결정 10). */
    private Integer version;
    /** 상단 고정 표시(ADR-0040 결정 5). 서비스가 기준일로 '지금 고정 중' 을 판정한다 — 응답에 그대로 싣지 않는다. */
    private String upendFixYn;
    /** 상단 고정 종료일(yyyyMMdd). 고정 중일 때만 응답에 싣는다. */
    private String upendFixEndYmd;
    /**
     * 게시판 이름 — 목록 질의가 이미 잇는 게시판 마스터의 값이다(새 조인 없음). [2026-10-26 ADR-0043, NAV-10] 통합 검색 응답만
     * 싣는다(BoardService#searchAcrossBoards).
     */
    private String bbsTtl;


}
