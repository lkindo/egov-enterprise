package nuri.business.domain.board;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
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
            BooleanBuilder visiblePosts = new BooleanBuilder(
                    QBoard.board.scrtYn.eq("N").or(QBoard.board.scrtYn.isNull()));
            if (StringUtils.hasText(condition.getViewerEsntlId())) {
                visiblePosts.or(QBoard.board.userId.eq(condition.getViewerEsntlId()));
            }
            builder.and(visiblePosts);
        }

        // [2026-10-01 결정 23] 게시 종료일이 지난 글은 일반 사용자의 목록·검색·통계에서 뺀다. 작성자는 자기 글을 계속
        //   보고(화면이 '게시 종료' 로 표시), 전체 열람 권한자는 기준일이 비어 이 조건을 받지 않는다.
        //   종료일은 yyyyMMdd 문자열이라 사전순 비교가 날짜 비교와 같다. 비어 있으면 기한 없음이다.
        if (StringUtils.hasText(condition.getPostingOpenOn())) {
            BooleanBuilder posting = new BooleanBuilder(QBoard.board.pstEndYmd.isNull()
                    .or(QBoard.board.pstEndYmd.eq(""))
                    .or(QBoard.board.pstEndYmd.goe(condition.getPostingOpenOn())));
            if (StringUtils.hasText(condition.getViewerEsntlId())) {
                posting.or(QBoard.board.userId.eq(condition.getViewerEsntlId()));
            }
            builder.and(posting);
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
