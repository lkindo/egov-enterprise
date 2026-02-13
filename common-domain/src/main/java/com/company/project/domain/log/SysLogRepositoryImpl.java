package com.company.project.domain.log;

import com.company.project.domain.code.QCommonCode;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@RequiredArgsConstructor
public class SysLogRepositoryImpl implements SysLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @jakarta.persistence.PersistenceContext
    private final EntityManager entityManager;

    @Override
    public Page<SysLog> searchSysLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        QCommonCode commonCode = QCommonCode.commonCode;

        List<SysLog> content = queryFactory
                .selectFrom(QSysLog.sysLog)
                .leftJoin(commonCode).on(QSysLog.sysLog.processSeCode.trim().eq(commonCode.code)
                        .and(commonCode.codeGroupId.eq("COM033")))
                .where(
                        processSeCodeNmLike(searchWrd, commonCode),
                        occrrncDeBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(QSysLog.sysLog.occrrncDe.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(QSysLog.sysLog.count())
                .from(QSysLog.sysLog)
                .leftJoin(commonCode).on(QSysLog.sysLog.processSeCode.trim().eq(commonCode.code)
                        .and(commonCode.codeGroupId.eq("COM033")))
                .where(
                        processSeCodeNmLike(searchWrd, commonCode),
                        occrrncDeBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    @Override
    @Transactional
    public void insertLogSummary() {
        String sql = "INSERT INTO SSYSLOGSUMMARY " +
                "SELECT TO_CHAR(b.OCCRRNC_DE, 'YYYYmmdd' ), b.SVC_NM, b.METHOD_NM, " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'C' THEN 1 ELSE 0 END), " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'U' THEN 1 ELSE 0 END), " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'R' THEN 1 ELSE 0 END), " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'D' THEN 1 ELSE 0 END), 0, 0 " +
                "FROM NSYSLOG b " +
                "WHERE NOT EXISTS (SELECT 1 FROM SSYSLOGSUMMARY c WHERE c.OCCRRNC_DE = TO_CHAR(NOW() - interval '1 day', 'YYYYmmdd')) "
                +
                "AND TO_CHAR(b.OCCRRNC_DE, 'YYYYmmdd' ) = TO_CHAR(NOW() - interval '1 day', 'YYYYmmdd') " +
                "GROUP BY TO_CHAR(b.OCCRRNC_DE, 'YYYYmmdd' ), b.SVC_NM, b.METHOD_NM";
        entityManager.createNativeQuery(sql).executeUpdate();
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String sql = "DELETE FROM NSYSLOG WHERE TO_CHAR(OCCRRNC_DE, 'YYYYmmdd') < TO_CHAR(NOW() - interval '" + months
                + " month', 'YYYYmmdd')";
        entityManager.createNativeQuery(sql).executeUpdate();
    }

    private BooleanExpression processSeCodeNmLike(String searchWrd, QCommonCode commonCode) {
        return StringUtils.hasText(searchWrd) ? commonCode.codeNm.contains(searchWrd) : null;
    }

    private BooleanExpression occrrncDeBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        return QSysLog.sysLog.occrrncDe.trim().between(searchBgnDe, searchEndDe);
    }
}
