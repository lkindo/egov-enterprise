package com.company.project.domain.integration;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

public class TransmitReceiveLogRepositoryImpl extends QuerydslRepositorySupport
        implements TransmitReceiveLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @PersistenceContext
    private EntityManager entityManager;

    public TransmitReceiveLogRepositoryImpl(JPAQueryFactory queryFactory) {
        super(TransmitReceiveLog.class);
        this.queryFactory = queryFactory;
    }

    @Override
    public List<TransmitReceiveLog> searchLogs(String searchWrd, String searchBgnDe, String searchEndDe, int offset,
            int limit) {
        return queryFactory
                .selectFrom(QTransmitReceiveLog.transmitReceiveLog)
                .where(
                        containsWord(searchWrd),
                        betweenDates(searchBgnDe, searchEndDe))
                .orderBy(QTransmitReceiveLog.transmitReceiveLog.occurrenceDe.desc())
                .offset(offset)
                .limit(limit)
                .fetch();
    }

    @Override
    public long countLogs(String searchWrd, String searchBgnDe, String searchEndDe) {
        return queryFactory
                .select(QTransmitReceiveLog.transmitReceiveLog.count())
                .from(QTransmitReceiveLog.transmitReceiveLog)
                .where(
                        containsWord(searchWrd),
                        betweenDates(searchBgnDe, searchEndDe))
                .fetchOne();
    }

    @Override
    public void insertLogSummary() {
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        String checkSql = "SELECT COUNT(*) FROM STRSMRCVLOGSUMMARY WHERE OCCRRNC_DE = :targetDe";
        Long exists = (Long) entityManager.createNativeQuery(checkSql)
                .setParameter("targetDe", yesterday)
                .getSingleResult();

        if (exists == 0) {
            String insertSql = "INSERT INTO STRSMRCVLOGSUMMARY " +
                    "SELECT b.OCCRRNC_DE, b.TRSMRCV_SE_CODE, b.PROVD_INSTT_ID, b.PROVD_SYS_ID, b.PROVD_SVC_ID, b.REQUST_INSTT_ID, b.REQUST_SYS_ID, "
                    +
                    "COUNT(b.OCCRRNC_DE) AS RDCNT, 0 AS ERROR_CO " +
                    "FROM NTRSMRCVLOG b " +
                    "WHERE b.OCCRRNC_DE = :targetDe " +
                    "GROUP BY b.OCCRRNC_DE, b.TRSMRCV_SE_CODE, b.PROVD_INSTT_ID, b.PROVD_SYS_ID, b.PROVD_SVC_ID, b.REQUST_INSTT_ID, b.REQUST_SYS_ID";

            entityManager.createNativeQuery(insertSql)
                    .setParameter("targetDe", yesterday)
                    .executeUpdate();
        }
    }

    @Override
    public void deleteOldLogs(int days) {
        String targetDe = LocalDate.now().minusDays(days).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String deleteSql = "DELETE FROM NTRSMRCVLOG WHERE OCCRRNC_DE < :targetDe";
        entityManager.createNativeQuery(deleteSql)
                .setParameter("targetDe", targetDe)
                .executeUpdate();
    }

    private BooleanExpression containsWord(String searchWrd) {
        return (searchWrd == null || searchWrd.isEmpty()) ? null
                : QTransmitReceiveLog.transmitReceiveLog.transmitReceiveSeCode.contains(searchWrd);
    }

    private BooleanExpression betweenDates(String searchBgnDe, String searchEndDe) {
        if (searchBgnDe == null || searchBgnDe.isEmpty() || searchEndDe == null || searchEndDe.isEmpty()) {
            return null;
        }
        String bgn = searchBgnDe.replace("-", "");
        String end = searchEndDe.replace("-", "");
        return QTransmitReceiveLog.transmitReceiveLog.occurrenceDe.between(bgn, end);
    }
}
