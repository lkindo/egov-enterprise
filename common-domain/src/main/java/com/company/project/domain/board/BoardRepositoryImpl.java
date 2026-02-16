package com.company.project.domain.board;

import com.querydsl.core.types.ExpressionUtils;
import com.querydsl.core.types.Projections;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

import com.company.project.domain.user.QUser;
import com.company.project.domain.comment.QComment;

@RequiredArgsConstructor
public class BoardRepositoryImpl implements BoardRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Optional<BoardDetailResult> findArticleDetail(BoardId id) {
        BoardDetailResult result = queryFactory
                .select(Projections.fields(BoardDetailResult.class,
                        QBoard.board.id.bbsId.as("bbsId"),
                        QBoard.board.id.nttId.as("nttId"),
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
                .leftJoin(QBoardMaster.boardMaster).on(QBoard.board.id.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                .where(QBoard.board.id.bbsId.eq(id.getBbsId())
                        .and(QBoard.board.id.nttId.eq(id.getNttId()))
                        .and(QBoard.board.useAt.eq("Y")))
                .fetchOne();

        return Optional.ofNullable(result);
    }

    @Override
    public Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(QBoard.board.id.bbsId.eq(condition.getBbsId()));
        }

        if (StringUtils.hasText(condition.getUseAt())) {
            builder.and(QBoard.board.useAt.eq(condition.getUseAt()));
        } else {
            builder.and(QBoard.board.useAt.eq("Y"));
        }

        if (StringUtils.hasText(condition.getSearchWrd())) {
            if ("0".equals(condition.getSearchCnd())) { // 제목
                builder.and(QBoard.board.nttSj.contains(condition.getSearchWrd()));
            } else if ("1".equals(condition.getSearchCnd())) { // 내용
                builder.and(QBoard.board.nttCn.contains(condition.getSearchWrd()));
            } else if ("2".equals(condition.getSearchCnd())) { // 작성자
                builder.and(QUser.user.userNm.contains(condition.getSearchWrd()));
            }
        }

        List<BoardSearchResult> results = queryFactory
                .select(Projections.fields(BoardSearchResult.class,
                        QBoard.board.id.bbsId.as("bbsId"),
                        QBoard.board.id.nttId.as("nttId"),
                        QBoard.board.nttSj,
                        QBoard.board.frstRegisterId,
                        QUser.user.userNm.coalesce(QBoard.board.ntcrNm).as("frstRegisterNm"),
                        QBoard.board.createdDate,
                        QBoard.board.inqireCo,
                        QBoard.board.parnts,
                        QBoard.board.replyAt,
                        QBoard.board.replyLc,
                        QBoard.board.useAt,
                        QBoard.board.atchFileId,
                        QBoard.board.ntceBgnde,
                        QBoard.board.ntceEndde,
                        QBoard.board.sjBoldAt,
                        QBoard.board.noticeAt,
                        QBoard.board.secretAt,
                        ExpressionUtils.as(
                                JPAExpressions
                                        .select(QComment.comment.count())
                                        .from(QComment.comment)
                                        .where(QComment.comment.bbsId.eq(QBoard.board.id.bbsId)
                                                .and(QComment.comment.nttId.eq(QBoard.board.id.nttId))
                                                .and(QComment.comment.useAt.eq("Y"))),
                                "commentCo")))
                .from(QBoard.board)
                .leftJoin(QUser.user).on(QBoard.board.frstRegisterId.eq(QUser.user.esntlId))
                .where(builder)
                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.nttNo.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(QBoard.board.count())
                .from(QBoard.board)
                .leftJoin(QUser.user).on(QBoard.board.frstRegisterId.eq(QUser.user.esntlId))
                .where(builder)
                .fetchOne();

        return new PageImpl<>(results, pageable, total != null ? total.longValue() : 0L);
    }

    @Override
    public Page<Board> search(BoardSearchCondition condition, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        // BBS_ID Check
        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(QBoard.board.id.bbsId.eq(condition.getBbsId()));
        }

        // USE_AT Check
        if (StringUtils.hasText(condition.getUseAt())) {
            builder.and(QBoard.board.useAt.eq(condition.getUseAt()));
        }

        // Search Condition
        if (StringUtils.hasText(condition.getSearchWrd())) {
            String searchWrd = condition.getSearchWrd();
            if ("0".equals(condition.getSearchCnd())) { // Title
                builder.and(QBoard.board.nttSj.contains(searchWrd));
            } else if ("1".equals(condition.getSearchCnd())) { // Content
                builder.and(QBoard.board.nttCn.contains(searchWrd));
            } else if ("2".equals(condition.getSearchCnd())) { // Writer
                builder.and(QBoard.board.ntcrNm.contains(searchWrd));
            }
        }

        // Select full entity to ensure all fields (including Auditing fields) are
        // populated
        List<Board> content = queryFactory
                .selectFrom(QBoard.board)
                .where(builder)
                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.nttNo.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(QBoard.board.count())
                .from(QBoard.board)
                .where(builder);

        return new PageImpl<>(content, pageable, countQuery.fetchOne());
    }

    @Override
    public Optional<Board> findByIdCustom(BoardId id) {
        Board result = queryFactory
                .selectFrom(QBoard.board)
                .where(QBoard.board.id.nttId.eq(id.getNttId())
                        .and(QBoard.board.id.bbsId.eq(id.getBbsId())))
                .fetchOne();

        return Optional.ofNullable(result);
    }
}
