package com.company.project.domain.namecard;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.namecard.QNameCard.nameCard;

/**
 * 筌뤿굟釉?Repository Custom ?닌뗭겱筌?
 */
@RequiredArgsConstructor
public class NameCardRepositoryImpl implements NameCardRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<NameCard> searchNameCards(String keyword, Pageable pageable) {
                List<NameCard> content = queryFactory
                                .selectFrom(nameCard)
                                .where(
                                                keywordContains(keyword),
                                                nameCard.othbcAt.eq("Y"))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(nameCard.ncrdNm.asc())
                                .fetch();

                long total = queryFactory
                                .select(nameCard.count())
                                .from(nameCard)
                                .where(
                                                keywordContains(keyword),
                                                nameCard.othbcAt.eq("Y"))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        private BooleanExpression keywordContains(String keyword) {
                return StringUtils.hasText(keyword) ? nameCard.ncrdNm.containsIgnoreCase(keyword)
                                .or(nameCard.cmpnyNm.containsIgnoreCase(keyword))
                                .or(nameCard.deptNm.containsIgnoreCase(keyword)) : null;
        }
}
