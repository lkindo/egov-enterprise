package nuri.business.domain.board;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
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
                return findArticleDetail(bbsId, pstSn, false);
        }

        @Override
        public Optional<BoardDetailResult> findArticleDetailIncludingDeleted(
                        @NonNull String bbsId, @NonNull Long pstSn) {
                return findArticleDetail(bbsId, pstSn, true);
        }

        @Override
        public Optional<BoardDetailResult> findPublicArticleDetail(
                        @NonNull String bbsId, @NonNull Long pstSn) {
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
                                                QBoard.board.scrtYn.eq("N"),
                                                QBoardMaster.boardMaster.useYn.eq("Y"))
                                .fetchOne();

                return Optional.ofNullable(result);
        }

        /**
         * @param includeDeleted 논리 삭제(useYn='N')된 게시글까지 포함할지 여부.
         *                       <b>호출부가 관리자 권한을 이미 판정한 경우에만</b> true 를 넘긴다
         *                       (BoardService#getPostDetail 의 복구·감사 경로). 게시판 마스터의
         *                       useYn 조건은 완화하지 않는다 — 비활성 게시판 전체 노출은 별개 결정이다.
         */
        private Optional<BoardDetailResult> findArticleDetail(
                        String bbsId, Long pstSn, boolean includeDeleted) {
                BooleanBuilder visibility = new BooleanBuilder()
                                .and(QBoard.board.bbsId.eq(bbsId))
                                .and(QBoard.board.pstSn.eq(pstSn))
                                .and(QBoardMaster.boardMaster.useYn.eq("Y"));

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
                                                 // [2026-08-29] cmnt_cnt 를 실제로 가져온다. 컬럼은 BoardEventListener 가
                                                 //   commentRepository.countBy… → syncCmntCntAtomic 으로 유지하는데,
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

                OrderSpecifier<?> orderSpecifier = QBoard.board.sortOrdr.desc();

                if (StringUtils.hasText(condition.getOrderBy())) {
                        switch (condition.getOrderBy()) {
                                case "views":
                                        orderSpecifier = QBoard.board.inqCnt.desc();
                                        break;
 
                                case "date":
                                        orderSpecifier = QBoard.board.crtDt.desc();        
                                        break;

                                // [2026-08-29] 화면의 정렬 선택지 '댓글순'(orderBy=comments)이 여기까지
                                //   전달되면서도 case 가 없어 default(sortOrdr.desc)로 조용히 떨어졌다.
                                //   즉 골라도 최신순과 같은 목록이 나왔고, 사용자는 정렬이 된 줄 알았다.
                                //   cmnt_cnt 는 BoardEventListener 가 실제로 유지하는 값이므로
                                //   선택지를 걷는 대신 약속대로 정렬한다(views 축과 대칭).
                                case "comments":
                                        orderSpecifier = QBoard.board.cmntCnt.desc();
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
                                                 // [2026-08-29] 상세와 같은 이유로 목록에도 댓글 수를 싣는다.
                                                 QBoard.board.cmntCnt.as("commentCnt")))
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(builder, QBoardMaster.boardMaster.useYn.eq("Y"))
                                .orderBy(orderSpecifier, QBoard.board.ansSn.asc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .innerJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(builder, QBoardMaster.boardMaster.useYn.eq("Y"))
                                .fetchOne();

                return new PageImpl<>(results, pageable,
                                total != null ? total.longValue() : 0L);
        }

        @Override
        public BoardStatsResult aggregateVisibleStats(@NonNull BoardSearchCondition condition) {
                BooleanBuilder visibility = BoardPredicate.searchBoard(condition);
                NumberExpression<Long> articleCount = QBoard.board.count();
                NumberExpression<Long> viewSum = QBoard.board.inqCnt.longValue().sum();

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
                        @NonNull String bbsId, String keyword, @NonNull Pageable pageable) {
                BooleanBuilder visibility = new BooleanBuilder()
                                .and(QBoard.board.bbsId.eq(bbsId))
                                .and(QBoard.board.useYn.eq("Y"))
                                .and(QBoard.board.scrtYn.eq("N"))
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
                                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.ansSn.asc())
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

        @Override
        public Optional<Board> findByIdCustom(@NonNull Long pstSn) {
                Board result = queryFactory
                                .selectFrom(QBoard.board)
                                .where(QBoard.board.pstSn.eq(pstSn))
                                .fetchOne();

                return Optional.ofNullable(result);
        }
}
