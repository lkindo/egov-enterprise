package nuri.business.domain.sms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SmsRecptnRepository extends JpaRepository<SmsRecptn, SmsRecptnId> {
    List<SmsRecptn> findByIdSmsTrsmSn(Long smsTrsmSn);

    /** Scalar keys avoid caching stale recipient state before the following row lock. */
    @org.springframework.data.jpa.repository.Query("select r.id.rcptnTelno from SmsRecptn r"
            + " where r.id.smsTrsmSn = :smsTrsmSn order by r.id.rcptnTelno")
    List<String> findRecipientNumbers(
            @org.springframework.data.repository.query.Param("smsTrsmSn") Long smsTrsmSn);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from SmsRecptn r where r.id = :id")
    java.util.Optional<SmsRecptn> findByIdForUpdate(
            @org.springframework.data.repository.query.Param("id") SmsRecptnId id);

    /** Limited caller page; oldest observed receipts first prevents newer batches from starving. */
    @org.springframework.data.jpa.repository.Query("select r from SmsRecptn r where r.rsltCd = 'P'"
            + " and (r.rsltMsg like :acceptedPattern or r.rsltMsg like :claimedPattern)"
            + " order by r.mdfcnDt asc, r.id.smsTrsmSn asc, r.id.rcptnTelno asc")
    @org.springframework.data.jpa.repository.QueryHints(@jakarta.persistence.QueryHint(
            name = "jakarta.persistence.query.timeout", value = "2000"))
    List<SmsRecptn> findPendingDeliveryReceipts(
            @org.springframework.data.repository.query.Param("acceptedPattern") String acceptedPattern,
            @org.springframework.data.repository.query.Param("claimedPattern") String claimedPattern,
            org.springframework.data.domain.Pageable pageable);

    /** 발송 건마다 결과 코드별 수신자 수. 목록 한 쪽을 한 번에 센다 — 행마다 다시 조회하지 않는다. */
    interface ResultCount {
        Long getSmsTrsmSn();
        String getRsltCd();
        long getCnt();
    }

    @org.springframework.data.jpa.repository.Query("select r.id.smsTrsmSn as smsTrsmSn, r.rsltCd as rsltCd, count(r) as cnt"
            + " from SmsRecptn r where r.id.smsTrsmSn in :smsTrsmSns group by r.id.smsTrsmSn, r.rsltCd")
    List<ResultCount> countByResult(
            @org.springframework.data.repository.query.Param("smsTrsmSns") java.util.Collection<Long> smsTrsmSns);
}
