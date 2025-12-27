package com.company.project.domain.board;

import com.querydsl.core.BooleanBuilder;
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

@RequiredArgsConstructor
public class BoardRepositoryImpl implements BoardRepositoryCustom {

    private final JPAQueryFactory queryFactory;

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

        // Use Projections.constructor to ensure stable column mapping
        List<Board> content = queryFactory
                .select(com.querydsl.core.types.Projections.constructor(Board.class,
                        board.id.nttId,
                        board.id.bbsId,
                        board.nttNo,
                        board.nttSj,
                        board.nttCn,
                        board.replyAt,
                        board.parnts,
                        board.replyLc,
                        board.sortOrdr,
                        board.inqireCo,
                        board.useAt,
                        board.ntceBgnde,
                        board.ntceEndde,
                        board.ntcrId,
                        board.ntcrNm,
                        board.password,
                        board.atchFileId,
                        board.frstRegisterId))
                .from(board)
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
                .select(com.querydsl.core.types.Projections.constructor(Board.class,
                        board.id.nttId,
                        board.id.bbsId,
                        board.nttNo,
                        board.nttSj,
                        board.nttCn,
                        board.replyAt,
                        board.parnts,
                        board.replyLc,
                        board.sortOrdr,
                        board.inqireCo,
                        board.useAt,
                        board.ntceBgnde,
                        board.ntceEndde,
                        board.ntcrId,
                        board.ntcrNm,
                        board.password,
                        board.atchFileId,
                        board.frstRegisterId))
                .from(board)
                .where(board.id.nttId.eq(id.getNttId())
                        .and(board.id.bbsId.eq(id.getBbsId())))
                .fetchOne();

        return Optional.ofNullable(result);
    }
}
