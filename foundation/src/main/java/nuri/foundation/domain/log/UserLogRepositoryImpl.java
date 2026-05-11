package nuri.foundation.domain.log;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@RequiredArgsConstructor
public class UserLogRepositoryImpl implements UserLogRepositoryCustom {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    public Page<UserLog> searchUserLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<UserLog> cq = cb.createQuery(UserLog.class);
        Root<UserLog> root = cq.from(UserLog.class);

        // JOIN 으로 사용자 정보 조회 (N+1 방지)
        Join<UserLog, Object> userJoin = root.join("vnUserMaster", JoinType.LEFT);

        List<Predicate> predicates = new ArrayList<>();

        // 사용자명 검색 조건
        if (searchWrd != null && !searchWrd.isEmpty()) {
            predicates.add(cb.like(userJoin.get("userNm"), "%" + searchWrd + "%"));
        }

        // 발생일자 범위 조건
        if (searchBgnDe != null && !searchBgnDe.isEmpty() && searchEndDe != null && !searchEndDe.isEmpty()) {
            String fromDe = searchBgnDe.replace("-", "");
            String toDe = searchEndDe.replace("-", "");
            predicates.add(cb.between(root.get("occrrncDe"), fromDe, toDe));
        }

        cq.where(predicates.toArray(new Predicate[0]));
        cq.orderBy(cb.desc(root.get("occrrncDe")));

        TypedQuery<UserLog> query = entityManager.createQuery(cq);
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<UserLog> content = query.getResultList();

        // 카운트 쿼리
        CriteriaQuery<Long> countCq = cb.createQuery(Long.class);
        Root<UserLog> countRoot = countCq.from(UserLog.class);
        Join<UserLog, Object> countUserJoin = countRoot.join("vnUserMaster", JoinType.LEFT);

        List<Predicate> countPredicates = new ArrayList<>();
        if (searchWrd != null && !searchWrd.isEmpty()) {
            countPredicates.add(cb.like(countUserJoin.get("userNm"), "%" + searchWrd + "%"));
        }
        if (searchBgnDe != null && !searchBgnDe.isEmpty() && searchEndDe != null && !searchEndDe.isEmpty()) {
            String fromDe = searchBgnDe.replace("-", "");
            String toDe = searchEndDe.replace("-", "");
            countPredicates.add(cb.between(countRoot.get("occrrncDe"), fromDe, toDe));
        }

        countCq.where(countPredicates.toArray(new Predicate[0]));
        countCq.select(cb.count(countRoot));

        Long total = entityManager.createQuery(countCq).getSingleResult();

        return new PageImpl<>(Objects.requireNonNull(content), pageable, total);
    }

    @Override
    @Transactional
    public void insertLogSummary() {
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "INSERT INTO NUSERLOG (OCCRRNC_DE, RQESTER_ID, SVC_NM, METHOD_NM, CREAT_CO, UPDT_CO, RDCNT, DELETE_CO, OUTPT_CO, ERROR_CO) "
                +
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
