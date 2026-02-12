package com.company.project.domain.recomendsite;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.recomendsite.QRecomendSite.recomendSite;

/**
 * 추천사이트 Repository Custom 구현체
 */
@RequiredArgsConstructor
public class RecomendSiteRepositoryImpl implements RecomendSiteRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<RecomendSite> searchRecomendSites(String keyword, Pageable pageable) {
        List<RecomendSite> content = queryFactory
                .selectFrom(recomendSite)
                .where(keywordContains(keyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(recomendSite.createdDate.desc())
                .fetch();

        long total = queryFactory
                .select(recomendSite.count())
                .from(recomendSite)
                .where(keywordContains(keyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression keywordContains(String keyword) {
        return StringUtils.hasText(keyword) ? 
                recomendSite.recomendSiteNm.containsIgnoreCase(keyword)
                .or(recomendSite.recomendSiteDc.containsIgnoreCase(keyword)) : null;
    }
}
