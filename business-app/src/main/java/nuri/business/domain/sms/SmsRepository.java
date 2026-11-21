package nuri.business.domain.sms;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * SMS Repository
 */
public interface SmsRepository extends JpaRepository<Sms, Long>, SmsRepositoryCustom {

    /** 보존 기간이 지난 발송 건의 일련번호를 오래된 순으로 한 묶음만 읽는다(보존 정리 전용). */
    @Query("select s.smsTrsmSn from Sms s where s.crtDt < :cutoff order by s.smsTrsmSn")
    List<Long> findIdsCreatedBefore(@Param("cutoff") LocalDateTime cutoff, Pageable page);

    /** 수신자 행을 먼저 지운 뒤 부른다 — 수신자 표가 발송 건을 FK 로 가리킨다. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Sms s where s.smsTrsmSn in :ids")
    int deleteByIdIn(@Param("ids") Collection<Long> ids);
}
