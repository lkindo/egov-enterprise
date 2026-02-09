package com.company.project.domain.log;

import com.company.project.domain.code.QCommonCode;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.log.QSysLog.sysLog;

@RequiredArgsConstructor
public class SysLogRepositoryImpl implements SysLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<SysLog> searchSysLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        QCommonCode commonCode = QCommonCode.commonCode;

        List<SysLog> content = queryFactory
                .selectFrom(sysLog)
                .leftJoin(commonCode).on(sysLog.processSeCode.trim().eq(commonCode.code)
                        .and(commonCode.codeGroupId.eq("COM033")))
                .where(
                        processSeCodeNmLike(searchWrd, commonCode),
                        occrrncDeBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(sysLog.occrrncDe.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(sysLog.count())
                .from(sysLog)
                .leftJoin(commonCode).on(sysLog.processSeCode.trim().eq(commonCode.code)
                        .and(commonCode.codeGroupId.eq("COM033")))
                .where(
                        processSeCodeNmLike(searchWrd, commonCode),
                        occrrncDeBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    private BooleanExpression processSeCodeNmLike(String searchWrd, QCommonCode commonCode) {
        return StringUtils.hasText(searchWrd) ? commonCode.codeNm.contains(searchWrd) : null;
    }

    private BooleanExpression occrrncDeBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        return sysLog.occrrncDe.trim().between(searchBgnDe, searchEndDe);
    }
}
