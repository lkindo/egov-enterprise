package com.company.project.domain.log;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.transaction.annotation.Transactional;
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
    private final EntityManager entityManager;

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

    @Override
    @Transactional
    public void insertLogSummary() {
        String sql = "INSERT INTO SUSERSUMMARY " +
                "SELECT TO_CHAR(b.CREAT_DT, 'YYYYmmdd' ), 'LGN', b.CONECT_MTHD, COUNT(b.CONECT_MTHD) " +
                "FROM NLOGINLOG b " +
                "WHERE NOT EXISTS (SELECT 1 FROM SUSERSUMMARY c WHERE c.OCCRRNC_DE = TO_CHAR(NOW() - interval '1 day', 'YYYYmmdd') AND c.STATS_SE = 'LGN') "
                +
                "AND TO_CHAR(b.CREAT_DT, 'YYYYmmdd' ) = TO_CHAR(NOW() - interval '1 day', 'YYYYmmdd') " +
                "GROUP BY TO_CHAR(b.CREAT_DT, 'YYYYmmdd' ), b.CONECT_MTHD";

        entityManager.createNativeQuery(sql).executeUpdate();
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String sql = "DELETE FROM NLOGINLOG WHERE TO_CHAR(CREAT_DT, 'YYYYmmdd') < TO_CHAR(NOW() - interval '" + months
                + " month', 'YYYYmmdd')";
        entityManager.createNativeQuery(sql).executeUpdate();
    }
}
