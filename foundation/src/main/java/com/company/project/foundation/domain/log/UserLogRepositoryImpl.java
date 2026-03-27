package com.company.project.foundation.domain.log;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

@RequiredArgsConstructor
public class UserLogRepositoryImpl implements UserLogRepositoryCustom {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public Page<UserLog> searchUserLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        String baseSql = "FROM NUSERLOG a LEFT OUTER JOIN COMVNUSERMASTER b ON a.RQESTER_ID = b.ESNTL_ID WHERE 1=1 ";
        StringBuilder whereSql = new StringBuilder();

        if (searchWrd != null && !searchWrd.isEmpty()) {
            whereSql.append("AND b.USER_NM LIKE :searchWrd ");
        }
        if (searchBgnDe != null && !searchBgnDe.isEmpty()) {
            whereSql.append("AND a.OCCRRNC_DE BETWEEN :searchBgnDe AND :searchEndDe ");
        }

        String selectSql = "SELECT a.* " + baseSql + whereSql + " ORDER BY a.OCCRRNC_DE DESC";
        String countSql = "SELECT COUNT(*) " + baseSql + whereSql;

        Query query = entityManager.createNativeQuery(selectSql, UserLog.class);
        Query countQuery = entityManager.createNativeQuery(countSql);

        if (searchWrd != null && !searchWrd.isEmpty()) {
            query.setParameter("searchWrd", "%" + searchWrd + "%");
            countQuery.setParameter("searchWrd", "%" + searchWrd + "%");
        }
        if (searchBgnDe != null && !searchBgnDe.isEmpty()) {
            query.setParameter("searchBgnDe", searchBgnDe.replace("-", ""));
            query.setParameter("searchEndDe", searchEndDe.replace("-", ""));
            countQuery.setParameter("searchBgnDe", searchBgnDe.replace("-", ""));
            countQuery.setParameter("searchEndDe", searchEndDe.replace("-", ""));
        }

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<UserLog> content = query.getResultList();
        Long total = ((Number) countQuery.getSingleResult()).longValue();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    @Override
    @Transactional
    public void insertLogSummary() {
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "INSERT INTO NUSERLOG (OCCRRNC_DE, RQESTER_ID, SVC_NM, METHOD_NM, CREAT_CO, UPDT_CO, RDCNT, DELETE_CO, OUTPT_CO, ERROR_CO) " +
                "SELECT b.OCCRRNC_DE, b.RQESTER_ID, b.SVC_NM, b.METHOD_NM, " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'C' THEN 1 ELSE 0 END), " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'U' THEN 1 ELSE 0 END), " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'R' THEN 1 ELSE 0 END), " +
                "SUM(CASE WHEN b.PROCESS_SE_CODE = 'D' THEN 1 ELSE 0 END), 0, 0 " +
                "FROM NSYSLOG b " +
                "WHERE NOT EXISTS (SELECT 1 FROM NUSERLOG c WHERE c.OCCRRNC_DE = :yesterday) " +
                "AND b.OCCRRNC_DE = :yesterday " +
                "AND b.RQESTER_ID IS NOT NULL " +
                "GROUP BY b.OCCRRNC_DE, b.RQESTER_ID, b.SVC_NM, b.METHOD_NM";

        entityManager.createNativeQuery(sql)
                .setParameter("yesterday", yesterday)
                .executeUpdate();
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String targetDe = LocalDate.now().minusMonths(months).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "DELETE FROM NSYSLOG WHERE OCCRRNC_DE < :targetDe";
        entityManager.createNativeQuery(sql)
                .setParameter("targetDe", targetDe)
                .executeUpdate();
    }
}
