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

        // Select full entity to ensure all fields (including Auditing fields) are populated
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
