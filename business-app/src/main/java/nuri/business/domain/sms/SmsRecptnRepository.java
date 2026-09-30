package nuri.business.domain.sms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SmsRecptnRepository extends JpaRepository<SmsRecptn, SmsRecptnId> {
    List<SmsRecptn> findByIdSmsTrsmSn(Long smsTrsmSn);

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
