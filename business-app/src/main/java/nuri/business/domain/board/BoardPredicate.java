package nuri.business.domain.board;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.StringExpression;
import org.springframework.util.StringUtils;

public class BoardPredicate {

    public static BooleanBuilder searchBoard(BoardSearchCondition condition) {
        BooleanBuilder builder = new BooleanBuilder();

        // [W1-25 P3③ 삭제] 검색어 UTF-8 hex 덤프 로그 제거.
        //   ① 인코딩 디버깅용 일회성 흔적이었고 ② 사용자 검색어를 **평문으로** 로그에 적재했으며
        //   ③ 문자열 조립이 log.debug 인자 평가보다 앞서 실행되므로 로그 레벨과 무관하게
        //      검색 1회당 String.format 이 바이트 수만큼 돌았다(한글 20자 = 60회).
        //   기본/dev 프로파일은 nuri: debug 라 실제로 출력까지 됐다. 가드가 아니라 삭제가 맞다.

        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(bbsIdEq(condition.getBbsId()));
        }

        if (StringUtils.hasText(condition.getUseYn())) {
            builder.and(QBoard.board.useYn.eq(condition.getUseYn()));
        }

        if (!condition.isSecretPostAdminOverride()) {
            BooleanBuilder visiblePosts = new BooleanBuilder(notSecret());
            if (StringUtils.hasText(condition.getViewerEsntlId())) {
                visiblePosts.or(QBoard.board.userId.eq(condition.getViewerEsntlId()));
            }
            builder.and(visiblePosts);
        }

        // [2026-10-01 결정 23·2026-10-23 ADR-0040 결정 3] 게시 기간 밖의 글(시작일 전·종료일 뒤)은 일반 사용자의
        //   목록·검색·통계·업무 홈 카드에서 뺀다. 작성자는 자기 글을 계속 보고(화면이 서버 게시 상태로 '예약'·'게시 종료' 를
        //   표시), 전체 열람 권한자는 기준일이 비어 이 조건을 받지 않는다. 날짜는 yyyyMMdd 문자열이라 사전순 비교가 날짜 비교와
        //   같다. 비어 있으면 시작일은 곧바로 게시, 종료일은 기한 없음이다.
        if (StringUtils.hasText(condition.getPostingOpenOn())) {
            BooleanBuilder posting = new BooleanBuilder(postingWithin(condition.getPostingOpenOn()));
            if (StringUtils.hasText(condition.getViewerEsntlId())) {
                posting.or(QBoard.board.userId.eq(condition.getViewerEsntlId()));
            }
            builder.and(posting);
        }

        // [2026-10-23 ADR-0040 결정 3] 게시 상태 조건 — 가시성과 독립이라 서버 기준일(baseYmd)로 건다. 조회 대행 권한자도 이
        //   조건으로 좁힌다(그때 postingOpenOn 은 비어 있다). 일반 사용자에게는 위 가시성 안에서만 좁혀진다.
        if (condition.getPostingStatus() != null && StringUtils.hasText(condition.getBaseYmd())) {
            builder.and(postingStatusIs(condition.getPostingStatus(), condition.getBaseYmd()));
        }

        // [ADR-0040 결정 5] 상단 고정 조건 — 게시 상태 조건처럼 서버 기준일로 판정하고 가시성과 독립이다. true 면 기준일에 고정
        //   중인 글, false 면 그 밖의 글(고정 표시가 있어도 종료일이 지났으면 고정 아님)이다.
        if (condition.getPinned() != null && StringUtils.hasText(condition.getBaseYmd())) {
            BooleanExpression pinned = pinActiveOn(condition.getBaseYmd());
            builder.and(condition.getPinned() ? pinned : pinned.not());
        }

        if (StringUtils.hasText(condition.getSearchWrd())) {
            String searchWrd = condition.getSearchWrd();
            if ("0".equals(condition.getSearchCnd())) { // Title
                builder.and(pstTtlContains(searchWrd));
            } else if ("1".equals(condition.getSearchCnd())) { // Content
                builder.and(pstCnContains(searchWrd));
            } else if ("2".equals(condition.getSearchCnd())) { // Writer
                builder.and(userNmContains(searchWrd));
            }
        }

        // [2026-09-26 DIP V6] 캘린더는 행사일(없으면 작성일)로 칸을 배치하므로 기간도 같은 날짜로 거른다.
        com.querydsl.core.types.dsl.DateTimeExpression<java.time.LocalDateTime> periodDate = condition.isEventDateBasis()
                ? QBoard.board.evntDt.coalesce(QBoard.board.crtDt)
                : QBoard.board.crtDt;

        if (condition.getStartDate() != null) {
            builder.and(periodDate.goe(condition.getStartDate()));
        }

        if (condition.getEndDate() != null) {
            builder.and(periodDate.loe(condition.getEndDate()));
        }

        if (StringUtils.hasText(condition.getQnaSttsCd())) {
            builder.and(QBoard.board.qnaSttsCd.eq(condition.getQnaSttsCd()));
        }

        if (StringUtils.hasText(condition.getQnaCatCd())) {
            builder.and(QBoard.board.qnaCatCd.eq(condition.getQnaCatCd()));
        }

        return builder;
    }

    /**
     * 게시 종료일이 비었거나 기준일(yyyyMMdd) 이후인 글 — 게시 기간의 종료 쪽 구성요소다. 목록·공개 FAQ 는
     * {@link #postingWithin} 으로 시작 쪽과 함께 쓴다(2026-10-23 ADR-0040 A0·결정 3).
     */
    public static BooleanExpression postingOpenOn(String ymd) {
        return QBoard.board.pstEndYmd.isNull()
                .or(QBoard.board.pstEndYmd.eq(""))
                .or(QBoard.board.pstEndYmd.goe(ymd));
    }

    /**
     * 게시 시작일이 비었거나 기준일(yyyyMMdd) 이전·당일인 글 — 게시 기간의 시작 쪽 구성요소다(2026-10-23 ADR-0040 결정 3).
     * 시작일이 기준일보다 뒤인 글은 예약 글이다.
     */
    public static BooleanExpression postingStartedOn(String ymd) {
        return QBoard.board.pstBgngYmd.isNull()
                .or(QBoard.board.pstBgngYmd.eq(""))
                .or(QBoard.board.pstBgngYmd.loe(ymd));
    }

    /**
     * 기준일에 게시 기간 안인 글(시작했고 끝나지 않았다). 목록·검색·통계·업무 홈 카드와 공개 FAQ 목록·상세가 같은 술어를 쓴다
     * (2026-10-23 ADR-0040 결정 3). 단건 판정({@code BoardPolicySupport.postingStatusOf})과 첨부 판정이 같은 비교를 한다.
     */
    public static BooleanExpression postingWithin(String ymd) {
        return postingOpenOn(ymd).and(postingStartedOn(ymd));
    }

    /**
     * 기준일의 게시 상태가 {@code status} 인 글(2026-10-23 ADR-0040 결정 3). 우선순위는 단건 판정과 같다: 종료일이 지났으면 ENDED,
     * 아니고 시작일 전이면 SCHEDULED, 그 밖은 POSTING 이다.
     */
    public static BooleanExpression postingStatusIs(nuri.business.service.board.dto.PostingStatus status, String ymd) {
        BooleanExpression ended = postingOpenOn(ymd).not();
        BooleanExpression scheduled = postingStartedOn(ymd).not();
        return switch (status) {
            case ENDED -> ended;
            case SCHEDULED -> postingOpenOn(ymd).and(scheduled);
            case POSTING -> postingWithin(ymd);
        };
    }

    /**
     * 게시 기준일(yyyyMMdd) — 작성일자와 게시 시작일 중 늦은 값이다(2026-10-23 ADR-0040 결정 4). 새 컬럼 없이 질의에서 계산한다.
     * 작성일시({@code crt_dt}, KST 저장)를 날짜 문자열로 바꿔 시작일과 사전순으로 비교한다. 시작일이 비었으면 작성일자다.
     * 작성일시가 없는 행은 null 이 되어 정렬에서 뒤로 간다({@link #postingOrder} 의 nullsLast).
     */
    public static StringExpression postingBaseYmd() {
        StringExpression created = Expressions.stringTemplate("format({0} as 'yyyyMMdd')", QBoard.board.crtDt);
        return new CaseBuilder()
                .when(QBoard.board.pstBgngYmd.isNotNull().and(QBoard.board.pstBgngYmd.gt(created)))
                .then(QBoard.board.pstBgngYmd)
                .otherwise(created);
    }

    /**
     * 게시판 목록의 일반 정렬(2026-10-23 ADR-0040 결정 4): 게시 기준일 내림차순(값이 없으면 뒤), 동률이면 작성일시, 작성 순번
     * 내림차순, 답글 순번 오름차순이다. 공개 FAQ 와 정렬값 없는 경로가 같은 순서를 쓴다.
     */
    public static OrderSpecifier<?>[] postingOrder() {
        return new OrderSpecifier<?>[] {
                postingBaseYmd().desc().nullsLast(),
                QBoard.board.crtDt.desc(),
                QBoard.board.sortOrdr.desc(),
                QBoard.board.ansSn.asc()
        };
    }

    /**
     * 기준일(yyyyMMdd)에 상단 고정 중인 글 — 고정 표시가 Y 이고 고정 종료일이 기준일과 같거나 뒤다(ADR-0040 결정 5). 종료일 당일까지
     * 고정이다. 상한 집계({@code BoardRepository#countActivePins})와 단건 판정({@code BoardPolicySupport.pinActive})이 같은 비교를
     * 한다.
     */
    public static BooleanExpression pinActiveOn(String ymd) {
        return QBoard.board.upendFixYn.eq("Y").and(QBoard.board.upendFixEndYmd.goe(ymd));
    }

    /**
     * 고정 순위 — 기준일에 고정 중인 글이 먼저(0), 나머지가 뒤(1)다. 게시판 단위 목록(게시판 목록의 기본·최신순, 업무 홈 카드,
     * 공개 FAQ)만 일반 정렬 앞에 둔다(ADR-0040 결정 5, D-15). 통합 검색과 조회순·댓글순은 쓰지 않는다.
     */
    public static OrderSpecifier<Integer> pinFirstOrder(String ymd) {
        return new CaseBuilder().when(pinActiveOn(ymd)).then(0).otherwise(1).asc();
    }

    /** 비밀글이 아닌 글. 값이 비어 있으면 비밀글이 아니다(목록 판정과 같다). */
    public static BooleanExpression notSecret() {
        return QBoard.board.scrtYn.eq("N").or(QBoard.board.scrtYn.isNull());
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QBoard.board.bbsId.eq(bbsId);
    }

    public static BooleanExpression pstTtlContains(String pstTtl) {
        return QBoard.board.pstTtl.contains(pstTtl);
    }

    public static BooleanExpression pstCnContains(String pstCn) {
        return QBoard.board.pstCn.contains(pstCn);
    }

    public static BooleanExpression userNmContains(String userNm) {
        return QBoard.board.userNm.contains(userNm);
    }
}
