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

// import static com.company.project.domain.log.QSysHistory.sysHistory; // Removed static import

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

        if ("0".equals(searchCnd)) { // 시스템명
            return QSysHistory.sysHistory.sysNm.contains(searchWrd);
        } else if ("1".equals(searchCnd)) { // 이력구분명 - 이 경우 SE_CODE와 조인이 필요할 수 있지만, 일단 코드로 검색하거나 단순 포함 검색으로 처리
            // 레거시에서는 CCMMNDETAILCODE와 조인하여 CODE_NM을 검색함.
            // 일단은 JOIN 생략하고 필요시 확장.
            return null;
        }

        return null;
    }
}
