package com.company.project.domain.log;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

@RequiredArgsConstructor
public class SysHistoryRepositoryImpl implements SysHistoryRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<SysHistory> searchSysHistories(String searchCnd, String searchWrd, Pageable pageable) {
        List<SysHistory> content = queryFactory
                .selectFrom(QSysHistory.sysHistory)
                .where(searchCondition(searchCnd, searchWrd))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(QSysHistory.sysHistory.frstRegisterPnttm.desc())
                .fetch();

        long total = queryFactory
                .select(QSysHistory.sysHistory.count())
                .from(QSysHistory.sysHistory)
                .where(searchCondition(searchCnd, searchWrd))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression searchCondition(String searchCnd, String searchWrd) {
        if (!StringUtils.hasText(searchWrd)) {
            return null;
        }

        if ("0".equals(searchCnd)) {
            return QSysHistory.sysHistory.sysNm.contains(searchWrd);
        }

        return null;
    }
}