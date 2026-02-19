package com.company.project.domain.board;

import com.querydsl.core.types.ExpressionUtils;
import com.querydsl.core.types.Projections;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

import com.company.project.domain.comment.QComment;
import com.company.project.domain.comment.CommentPredicate;
import com.company.project.domain.user.entity.QUser;

@RequiredArgsConstructor
public class BoardRepositoryImpl implements BoardRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Optional<BoardDetailResult> findArticleDetail(@NonNull Long id) {
                BoardDetailResult result = queryFactory
                                .select(Projections.fields(BoardDetailResult.class,
                                                QBoard.board.bbsId,
                                                QBoard.board.nttId,
                                                QBoard.board.nttSj,
                                                QBoard.board.ntcrId,
                                                QBoard.board.ntcrNm,
                                                QBoard.board.nttNo,
                                                QBoard.board.nttCn,
                                                QBoard.board.password,
                                                QBoard.board.frstRegisterId,
                                                QUser.user.userNm.coalesce(QBoard.board.ntcrNm).as("frstRegisterNm"),
                                                QBoard.board.createdDate,
                                                QBoard.board.ntceBgnde,
                                                QBoard.board.ntceEndde,
                                                QBoard.board.inqireCo,
                                                QBoard.board.useAt,
                                                QBoard.board.atchFileId,
                                                QBoard.board.parnts,
                                                QBoard.board.replyAt,
                                                QBoard.board.replyLc,
                                                QBoard.board.sortOrdr,
                                                QBoard.board.sjBoldAt,
                                                QBoard.board.noticeAt,
                                                QBoard.board.secretAt,
                                                QBoardMaster.boardMaster.bbsTyCode,
                                                QBoardMaster.boardMaster.replyPosblAt,
                                                QBoardMaster.boardMaster.fileAtchPosblAt,
                                                QBoardMaster.boardMaster.atchPosblFileNumber,
                                                QBoardMaster.boardMaster.bbsNm))
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.frstRegisterId.eq(QUser.user.esntlId))
                                .leftJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(QBoard.board.nttId.eq(id))
                                .fetchOne();

                return Optional.ofNullable(result);
        }

        @Override
        public Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, @NonNull Pageable pageable) {
                BooleanBuilder builder = BoardPredicate.searchBoard(condition);

                var commentCountSubquery = JPAExpressions.select(QComment.comment.count())
                                .from(QComment.comment)
                                .where(CommentPredicate.bbsIdAndNttIdEq(QBoard.board.bbsId, QBoard.board.nttId));

                OrderSpecifier<?> orderSpecifier = QBoard.board.sortOrdr.desc();

                if (StringUtils.hasText(condition.getOrderBy())) {
                        switch (condition.getOrderBy()) {
                                case "views":
                                        orderSpecifier = QBoard.board.inqireCo.desc();
                                        break;
                                case "comments":
                                        orderSpecifier = new OrderSpecifier<>(Order.DESC, commentCountSubquery);
                                        break;
                                case "date":
                                        orderSpecifier = QBoard.board.createdDate.desc();
                                        break;
                        }
                }

                List<BoardSearchResult> results = queryFactory
                                .select(Projections.fields(BoardSearchResult.class,
                                                QBoard.board.nttId,
                                                QBoard.board.bbsId,
                                                QBoard.board.nttSj,
                                                QBoard.board.ntcrNm,
                                                QBoard.board.createdDate,
                                                QBoard.board.inqireCo,
                                                QBoard.board.replyAt,
                                                QBoard.board.parnts,
                                                QBoard.board.replyLc,
                                                QBoard.board.sortOrdr,
                                                QBoard.board.nttNo,
                                                QBoard.board.noticeAt,
                                                QBoard.board.secretAt,
                                                ExpressionUtils.as(commentCountSubquery, "commentCo")))
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.frstRegisterId.eq(QUser.user.esntlId))
                                .where(builder)
                                .orderBy(orderSpecifier, QBoard.board.nttNo.asc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.frstRegisterId.eq(QUser.user.esntlId))
                                .where(builder)
                                .fetchOne();

                return new PageImpl<>(results, pageable,
                                total != null ? total.longValue() : 0L);
        }

        @Override
        public Page<Board> search(BoardSearchCondition condition, @NonNull Pageable pageable) {
                BooleanBuilder builder = BoardPredicate.searchBoard(condition);

                List<Board> content = queryFactory
                                .selectFrom(QBoard.board)
                                .where(builder)
                                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.nttNo.asc())
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
        public Optional<Board> findByIdCustom(@NonNull Long id) {
                Board result = queryFactory
                                .selectFrom(QBoard.board)
                                .where(QBoard.board.nttId.eq(id))
                                .fetchOne();

                return Optional.ofNullable(result);
        }
}
