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

import static com.company.project.domain.board.QBoard.board;
import static com.company.project.domain.user.QUser.user;
import static com.company.project.domain.comment.QComment.comment;

import static com.company.project.domain.board.QBoardMaster.boardMaster;

@RequiredArgsConstructor
public class BoardRepositoryImpl implements BoardRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Optional<BoardDetailResult> findArticleDetail(BoardId id) {
        BoardDetailResult result = queryFactory
                .select(Projections.fields(BoardDetailResult.class,
                        board.id.bbsId,
                        board.id.nttId,
                        board.nttSj,
                        board.ntcrId,
                        board.ntcrNm,
                        board.nttNo,
                        board.nttCn,
                        board.password,
                        board.frstRegisterId,
                        user.userNm.coalesce(board.ntcrNm).as("frstRegisterNm"),
                        board.createdDate,
                        board.ntceBgnde,
                        board.ntceEndde,
                        board.inqireCo,
                        board.useAt,
                        board.atchFileId,
                        board.parnts,
                        board.replyAt,
                        board.replyLc,
                        board.sortOrdr,
                        board.sjBoldAt,
                        board.noticeAt,
                        board.secretAt,
                        boardMaster.bbsTyCode,
                        boardMaster.replyPosblAt,
                        boardMaster.fileAtchPosblAt,
                        boardMaster.atchPosblFileNumber,
                        boardMaster.bbsNm))
                .from(board)
                .leftJoin(user).on(board.frstRegisterId.eq(user.esntlId))
                .leftJoin(boardMaster).on(board.id.bbsId.eq(boardMaster.bbsId))
                .where(board.id.bbsId.eq(id.getBbsId())
                        .and(board.id.nttId.eq(id.getNttId()))
                        .and(board.useAt.eq("Y")))
                .fetchOne();

        return Optional.ofNullable(result);
    }

    @Override
    public Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(board.id.bbsId.eq(condition.getBbsId()));
        }

        if (StringUtils.hasText(condition.getUseAt())) {
            builder.and(board.useAt.eq(condition.getUseAt()));
        } else {
            builder.and(board.useAt.eq("Y"));
        }

        if (StringUtils.hasText(condition.getSearchWrd())) {
            if ("0".equals(condition.getSearchCnd())) { // 제목
                builder.and(board.nttSj.contains(condition.getSearchWrd()));
            } else if ("1".equals(condition.getSearchCnd())) { // 내용
                builder.and(board.nttCn.contains(condition.getSearchWrd()));
            } else if ("2".equals(condition.getSearchCnd())) { // 작성자
                builder.and(user.userNm.contains(condition.getSearchWrd()));
            }
        }

        List<BoardSearchResult> results = queryFactory
                .select(Projections.fields(BoardSearchResult.class,
                        board.id.bbsId,
                        board.id.nttId,
                        board.nttSj,
                        board.frstRegisterId,
                        user.userNm.coalesce(board.ntcrNm).as("frstRegisterNm"),
                        board.createdDate,
                        board.inqireCo,
                        board.parnts,
                        board.replyAt,
                        board.replyLc,
                        board.useAt,
                        board.atchFileId,
                        board.ntceBgnde,
                        board.ntceEndde,
                        board.sjBoldAt,
                        board.noticeAt,
                        board.secretAt,
                        ExpressionUtils.as(
                                JPAExpressions
                                        .select(comment.count())
                                        .from(comment)
                                        .where(comment.bbsId.eq(board.id.bbsId)
                                                .and(comment.nttId.eq(board.id.nttId))
                                                .and(comment.useAt.eq("Y"))),
                                "commentCo")))
                .from(board)
                .leftJoin(user).on(board.frstRegisterId.eq(user.esntlId))
                .where(builder)
                .orderBy(board.sortOrdr.desc(), board.nttNo.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(board.count())
                .from(board)
                .leftJoin(user).on(board.frstRegisterId.eq(user.esntlId))
                .where(builder)
                .fetchOne();

        return new PageImpl<>(results, pageable, total != null ? total.longValue() : 0L);
    }

    @Override
    public Page<Board> search(BoardSearchCondition condition, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        // BBS_ID Check
        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(board.id.bbsId.eq(condition.getBbsId()));
        }

        // USE_AT Check
        if (StringUtils.hasText(condition.getUseAt())) {
            builder.and(board.useAt.eq(condition.getUseAt()));
        }

        // Search Condition
        if (StringUtils.hasText(condition.getSearchWrd())) {
            String searchWrd = condition.getSearchWrd();
            if ("0".equals(condition.getSearchCnd())) { // Title
                builder.and(board.nttSj.contains(searchWrd));
            } else if ("1".equals(condition.getSearchCnd())) { // Content
                builder.and(board.nttCn.contains(searchWrd));
            } else if ("2".equals(condition.getSearchCnd())) { // Writer
                builder.and(board.ntcrNm.contains(searchWrd));
            }
        }

        // Select full entity to ensure all fields (including Auditing fields) are
        // populated
        List<Board> content = queryFactory
                .selectFrom(board)
                .where(builder)
                .orderBy(board.sortOrdr.desc(), board.nttNo.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(board.count())
                .from(board)
                .where(builder);

        return new PageImpl<>(content, pageable, countQuery.fetchOne());
    }

    @Override
    public Optional<Board> findByIdCustom(BoardId id) {
        Board result = queryFactory
                .selectFrom(board)
                .where(board.id.nttId.eq(id.getNttId())
                        .and(board.id.bbsId.eq(id.getBbsId())))
                .fetchOne();

        return Optional.ofNullable(result);
    }
}
