package nuri.business.domain.board;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Optional;
import nuri.business.domain.user.entity.QUser;

public class BoardRepositoryImpl implements BoardRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        public BoardRepositoryImpl(EntityManager em) {
                this.queryFactory = new JPAQueryFactory(em);
        }

        @Override
        public Optional<BoardDetailResult> findActiveArticleDetail(
                        @NonNull String bbsId, @NonNull Long pstSn) {
                return findArticleDetail(bbsId, pstSn, false, false);
        }

        @Override
        public Optional<BoardDetailResult> findArticleDetailIncludingDeleted(
                        @NonNull String bbsId, @NonNull Long pstSn) {
                return findArticleDetail(bbsId, pstSn, true, false);
        }

        @Override
        public Optional<BoardDetailResult> findArticleDetailOnInactiveBoard(
                        @NonNull String bbsId, @NonNull Long pstSn, boolean includeDeleted) {
                return findArticleDetail(bbsId, pstSn, includeDeleted, true);
        }

        @Override
        public Optional<BoardDetailResult> findPublicArticleDetail(
                        @NonNull String bbsId, @NonNull Long pstSn, @NonNull String today) {
                BoardDetailResult result = queryFactory
                                .select(Projections.fields(BoardDetailResult.class,
                                                QBoard.board.bbsId,
                                                QBoard.board.pstSn,
                                                QBoard.board.pstTtl,
                                                QBoard.board.pstCn,
                                                QBoard.board.inqCnt,
                                                QBoard.board.crtDt.as("crtDt"),
                                                QBoard.board.useYn,
                                                QBoard.board.scrtYn))
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(QBoard.board.bbsId.eq(bbsId),
                                                QBoard.board.pstSn.eq(pstSn),
                                                QBoard.board.useYn.eq("Y"),
                                                BoardPredicate.notSecret(),
                                                // [2026-10-23 ADR-0040 결정 3] 목록과 같은 게시 기간(시작일·종료일) 술어다.
                                                BoardPredicate.postingWithin(today),
                                                QBoardMaster.boardMaster.useYn.eq("Y"))
                                .fetchOne();

                return Optional.ofNullable(result);
        }

        /**
         * @param includeDeleted 논리 삭제(useYn='N')된 게시글까지 포함할지 여부.
         *                       <b>호출부가 관리자 권한을 이미 판정한 경우에만</b> true 를 넘긴다
         *                       (BoardService#getPostDetail 의 복구·감사 경로).
         * @param onInactiveBoard 사용 안 함 게시판(마스터 useYn='N')의 글을 읽는다. [2026-10-23 ADR-0040 결정 1] 호출부가
         *                        조회 대행 권한(BOARD_READ_ALL)과 사용 안 함을 이미 판정한 경우에만 true 다. 사용 중인
         *                        게시판의 글은 이 경로로 읽지 않는다(활성 경로와 섞이지 않게 마스터 useYn='N' 을 요구한다).
         */
        private Optional<BoardDetailResult> findArticleDetail(
                        String bbsId, Long pstSn, boolean includeDeleted, boolean onInactiveBoard) {
                BooleanBuilder visibility = new BooleanBuilder()
                                .and(QBoard.board.bbsId.eq(bbsId))
                                .and(QBoard.board.pstSn.eq(pstSn))
                                .and(QBoardMaster.boardMaster.useYn.eq(onInactiveBoard ? "N" : "Y"));

                if (!includeDeleted) {
                        visibility.and(QBoard.board.useYn.eq("Y"));
                }

                BoardDetailResult result = queryFactory
                                .select(Projections.fields(BoardDetailResult.class,
                                                 QBoard.board.bbsId,
                                                 QBoard.board.pstSn,
                                                 QBoard.board.pstTtl,
                                                 QBoard.board.userId,
                                                 QBoard.board.ansSn,
                                                 QBoard.board.pstCn,
                                                 QBoard.board.pswd,
                                                 QBoard.board.frstRgtrId.as("frstRgtrId"),
                                                 QUser.user.userNm.coalesce(QBoard.board.userNm).as("userNm"),
                                                 QBoard.board.crtDt.as("crtDt"),
                                                 QBoard.board.pstBgngYmd,
                                                 QBoard.board.pstEndYmd,
                                                 QBoard.board.inqCnt,
                                                 QBoard.board.likeCnt,
                                                 QBoard.board.useYn,
                                                 QBoard.board.atchFileSn,
                                                 QBoard.board.upPstSn,
                                                 QBoard.board.sortOrdr,
                                                 QBoard.board.ttlBoldYn,
                                                 QBoard.board.scrtYn,
                                                 QBoard.board.evntDt,
                                                 QBoard.board.qnaSttsCd,
                                                 QBoard.board.qnaCatCd,
                                                 // [2026-10-23 ADR-0040 결정 10] 수정 요청이 돌려보낼 게시글 버전.
                                                 QBoard.board.version,
                                                 // [ADR-0040 결정 5] 상단 고정 — 목록과 같이 서비스가 기준일로 판정한다.
                                                 QBoard.board.upendFixYn,
                                                 QBoard.board.upendFixEndYmd,
                                                 // [2026-08-29] cmnt_cnt 를 실제로 가져온다. 컬럼은 BoardEventListener 가
                                                 //   PostCommentCountChangedEvent 를 받아 adjustCmntCntAtomic 으로 유지하는데,
                                                 //   목록·상세 projection 이 둘 다 이 필드를 빼고 있어 화면의 '댓글 N' 이
                                                 //   글마다 언제나 0 이었다. 값이 없는 게 아니라 안 가져온 것이다.
                                                 QBoard.board.cmntCnt.as("commentCnt"),
                                                 QBoardMaster.boardMaster.bbsTypeCd.as("bbsTypeCd"),
                                                 QBoardMaster.boardMaster.ansPsbltyYn.as("ansPsbltyYn"),
                                                 QBoardMaster.boardMaster.fileAtchPsbltyYn.as("fileAtchPsbltyYn"),
                                                 QBoardMaster.boardMaster.atchPsbltyFileQty.as("atchPsbltyFileQty"),
                                                 QBoardMaster.boardMaster.bbsTtl.as("bbsTtl")))
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.frstRgtrId.eq(QUser.user.esntlId))
                                .leftJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(visibility)
                                .fetchOne();

                return Optional.ofNullable(result);
        }

        @Override
        public Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, @NonNull Pageable pageable) {
                BooleanBuilder builder = BoardPredicate.searchBoard(condition);
                // [2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판 제외 축. 술어를 QBoard 가 아니라
                //   조인된 QBoardMaster 에 걸어야 하므로 BoardPredicate 가 아닌 여기서 더한다.
                //   꺼져 있으면 null 이라 where 절에 아무 조건도 붙지 않는다(종전 동작 그대로).
                BooleanExpression communityScope = condition.isExcludeCommunityBoards()
                                ? QBoardMaster.boardMaster.cmntySn.isNull()
                                : null;
                // [2026-10-23 ADR-0040 결정 1] 사용 중인 게시판만 싣는다. 조회 대행 권한자가 사용 안 함 게시판의 목록을 여는
                //   경우에만 호출부가 축을 켜고, 그때는 이 조건을 걸지 않는다(null 은 where 에서 빠진다).
                BooleanExpression boardInUse = condition.isIncludeInactiveBoard()
                                ? null
                                : QBoardMaster.boardMaster.useYn.eq("Y");

                // [2026-10-23 ADR-0040 결정 4] 일반 정렬은 게시 기준일(작성일자와 게시 시작일 중 늦은 값) 순이다 — 정렬값이 없거나
                //   'date'·모르는 값이면 그 순서이고, 'views'·'comments' 는 그 열을 먼저 본 뒤 같은 순서로 동률을 가른다(결정적 순서).
                //   종전 기본은 작성 순번(sortOrdr), 'date' 는 작성일시였다.
                OrderSpecifier<?>[] orderSpecifiers = BoardPredicate.postingOrder();
                // [ADR-0040 결정 5, D-15] 게시판 목록은 기본·최신순(정렬값 없음·'date'·모르는 값)에서 고정 중인 글을 맨 앞에 둔다.
                //   사용자가 고른 조회순·댓글순과 고정 우선을 끈 경로(통합 검색)는 그대로다. 고정 판정의 기준일은 서버 기준일이다.
                boolean userChosenOrder = "views".equals(condition.getOrderBy()) || "comments".equals(condition.getOrderBy());
                if (condition.isPinFirst() && !userChosenOrder && StringUtils.hasText(condition.getBaseYmd())) {
                        orderSpecifiers = leading(BoardPredicate.pinFirstOrder(condition.getBaseYmd()), orderSpecifiers);
                }

                if (StringUtils.hasText(condition.getOrderBy())) {
                        switch (condition.getOrderBy()) {
                                case "views":
                                        orderSpecifiers = leading(QBoard.board.inqCnt.desc(), orderSpecifiers);
                                        break;

                                // [2026-08-29] 화면의 정렬 선택지 '댓글순'(orderBy=comments)이 여기까지
                                //   전달되면서도 case 가 없어 default(sortOrdr.desc)로 조용히 떨어졌다.
                                //   즉 골라도 최신순과 같은 목록이 나왔고, 사용자는 정렬이 된 줄 알았다.
                                //   cmnt_cnt 는 BoardEventListener 가 실제로 유지하는 값이므로
                                //   선택지를 걷는 대신 약속대로 정렬한다(views 축과 대칭).
                                case "comments":
                                        orderSpecifiers = leading(QBoard.board.cmntCnt.desc(), orderSpecifiers);
                                        break;

                                default:
                                        // 'date'·'latest' 등은 게시 기준일 순 그대로다.
                                        break;
                        }
                }

                List<BoardSearchResult> results = queryFactory
                                .select(Projections.fields(BoardSearchResult.class,
                                                 QBoard.board.pstSn,
                                                 QBoard.board.bbsId,
                                                 QBoard.board.pstTtl,
                                                 QBoard.board.userNm,
                                                 QBoard.board.crtDt.as("crtDt"),
                                                 QBoard.board.inqCnt,
                                                 QBoard.board.likeCnt,
                                                 QBoard.board.upPstSn,
                                                 QBoard.board.sortOrdr,
                                                 QBoard.board.ansSn,
                                                 QBoard.board.scrtYn,
                                                 QBoard.board.evntDt,
                                                 QBoard.board.qnaSttsCd,
                                                 QBoard.board.qnaCatCd,
                                                 // [2026-10-23 ADR-0040 A0] 게시 기간. 목록 템플릿의 '게시 종료' 배지가 그릴 값을
                                                 //   받지 못해 작성자가 자기 종료 글을 목록에서 구분할 수 없었다.
                                                 QBoard.board.pstBgngYmd,
                                                 QBoard.board.pstEndYmd,
                                                 // [2026-10-23 ADR-0040 결정 10] 운영 화면 빠른 편집이 돌려보낼 게시글 버전.
                                                 QBoard.board.version,
                                                 // [ADR-0040 결정 5] 상단 고정 — 서비스가 기준일로 '지금 고정 중' 을 판정한다.
                                                 QBoard.board.upendFixYn,
                                                 QBoard.board.upendFixEndYmd,
                                                 // [2026-08-29] 상세와 같은 이유로 목록에도 댓글 수를 싣는다.
                                                 QBoard.board.cmntCnt.as("commentCnt")))
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(builder, boardInUse, communityScope)
                                .orderBy(orderSpecifiers)
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(builder, boardInUse, communityScope)
                                .fetchOne();

                return new PageImpl<>(results, pageable,
                                total != null ? total.longValue() : 0L);
        }

        @Override
        public BoardStatsResult aggregateVisibleStats(@NonNull BoardSearchCondition condition) {
                BooleanBuilder visibility = BoardPredicate.searchBoard(condition);
                NumberExpression<Long> articleCount = QBoard.board.count();
                NumberExpression<Long> viewSum = QBoard.board.inqCnt.longValue().sumLong();

                Tuple totals = queryFactory
                                .select(articleCount, viewSum)
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(visibility, QBoardMaster.boardMaster.useYn.eq("Y"))
                                .fetchOne();

                NumberExpression<Long> contributorArticleCount = QBoard.board.count();
                String topContributor = queryFactory
                                .select(QBoard.board.userNm)
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(visibility,
                                                QBoardMaster.boardMaster.useYn.eq("Y"))
                                .groupBy(QBoard.board.userNm)
                                .orderBy(contributorArticleCount.desc(), QBoard.board.userNm.asc())
                                .fetchFirst();

                Long totalArticles = totals != null ? totals.get(articleCount) : null;
                Long totalViews = totals != null ? totals.get(viewSum) : null;
                return new BoardStatsResult(
                                totalArticles != null ? totalArticles : 0L,
                                totalViews != null ? totalViews : 0L,
                                topContributor);
        }

        @Override
        public Page<BoardSearchResult> searchPublicFaqArticles(
                        @NonNull String bbsId, String keyword, @NonNull String today, @NonNull Pageable pageable) {
                // [2026-10-23 ADR-0040 A0] 공개 FAQ 는 누구에게나 같은 목록이다 — 비밀글과 같이 게시 종료 글도
                //   권한과 상관없이 뺀다. 종전에는 종료일 조건이 없어 일반 목록에서 사라진 글이 여기서 계속 보였다.
                //   [결정 3] 예약 글(시작일 전)도 같은 이유로 뺀다.
                BooleanBuilder visibility = new BooleanBuilder()
                                .and(QBoard.board.bbsId.eq(bbsId))
                                .and(QBoard.board.useYn.eq("Y"))
                                .and(BoardPredicate.notSecret())
                                .and(BoardPredicate.postingWithin(today))
                                .and(QBoardMaster.boardMaster.useYn.eq("Y"));
                if (StringUtils.hasText(keyword)) {
                        visibility.and(QBoard.board.pstTtl.contains(keyword));
                }

                List<BoardSearchResult> results = queryFactory
                                .select(Projections.fields(BoardSearchResult.class,
                                                QBoard.board.pstSn,
                                                QBoard.board.bbsId,
                                                QBoard.board.pstTtl,
                                                QBoard.board.crtDt.as("crtDt"),
                                                QBoard.board.inqCnt,
                                                QBoard.board.useYn,
                                                QBoard.board.scrtYn))
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(visibility)
                                // [2026-10-23 ADR-0040 결정 4·5] 게시판 목록의 기본 정렬과 같다 — 고정 중인 글이 먼저, 그다음 게시 기준일 순이다.
                                .orderBy(leading(BoardPredicate.pinFirstOrder(today), BoardPredicate.postingOrder()))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(visibility)
                                .fetchOne();

                return new PageImpl<>(results, pageable, total != null ? total : 0L);
        }

        /** 앞에 한 정렬 키를 더한 새 배열. 뒤의 키는 결정적 동률 처리다. */
        private static OrderSpecifier<?>[] leading(OrderSpecifier<?> first, OrderSpecifier<?>[] rest) {
                OrderSpecifier<?>[] combined = new OrderSpecifier<?>[rest.length + 1];
                combined[0] = first;
                System.arraycopy(rest, 0, combined, 1, rest.length);
                return combined;
        }

        @Override
        public Page<Board> search(BoardSearchCondition condition, @NonNull Pageable pageable) {  
                BooleanBuilder builder = BoardPredicate.searchBoard(condition);

                List<Board> content = queryFactory
                                .selectFrom(QBoard.board)
                                .where(builder)
                                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.ansSn.asc()) 
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long totalResult = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .where(builder)
                                .fetchOne();

                return new PageImpl<>(content, pageable,
                                totalResult != null ? totalResult : 0L);
        }
}
