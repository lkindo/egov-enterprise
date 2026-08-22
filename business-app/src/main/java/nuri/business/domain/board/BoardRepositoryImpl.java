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
                return findArticleDetail(bbsId, pstSn);
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

        private Optional<BoardDetailResult> findArticleDetail(
                        String bbsId, Long pstSn) {
                BooleanBuilder visibility = new BooleanBuilder()
                                .and(QBoard.board.bbsId.eq(bbsId))
                                .and(QBoard.board.pstSn.eq(pstSn))
                                .and(QBoard.board.useYn.eq("Y"))
                                .and(QBoardMaster.boardMaster.useYn.eq("Y"));

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
                                                 QBoard.board.qnaCatCd))
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
