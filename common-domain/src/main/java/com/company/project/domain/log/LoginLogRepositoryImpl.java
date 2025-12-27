package com.company.project.domain.log;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static com.company.project.domain.log.QLoginLog.loginLog;

@RequiredArgsConstructor
public class LoginLogRepositoryImpl implements LoginLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<LoginLog> searchLoginLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        List<LoginLog> content = queryFactory
                .selectFrom(loginLog)
                .where(
                        loginMthdLike(searchWrd),
                        creatDtBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(loginLog.creatDt.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(loginLog.count())
                .from(loginLog)
                .where(
                        loginMthdLike(searchWrd),
                        creatDtBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    private BooleanExpression loginMthdLike(String searchWrd) {
        return StringUtils.hasText(searchWrd) ? loginLog.loginMthd.contains(searchWrd) : null;
    }

    private BooleanExpression creatDtBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        try {
            LocalDateTime start = LocalDate.parse(searchBgnDe, DateTimeFormatter.ofPattern("yyyyMMdd")).atStartOfDay();
            LocalDateTime end = LocalDate.parse(searchEndDe, DateTimeFormatter.ofPattern("yyyyMMdd"))
                    .atTime(LocalTime.MAX);
            return loginLog.creatDt.between(start, end);
        } catch (Exception e) {
            return null;
        }
    }
}
