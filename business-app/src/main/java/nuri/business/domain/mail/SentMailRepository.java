package nuri.business.domain.mail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 발송메일 Repository
 */
public interface SentMailRepository extends JpaRepository<SentMail, Long>, SentMailRepositoryCustom {

    /**
     * 재발송 차지(2026-09-26 DIP B5 F7). 발신자 본인의 메일이 실패('F')했거나 대기('P')에 {@code stuckBefore} 전부터
     * 멈춰 있을 때만 대기로 되돌리고 발송 시각을 지금으로 바꾼다. 한 번의 UPDATE 라 두 번 누른 재발송은 하나만 이긴다 —
     * 진행 중인 대기 건을 다시 보내면 같은 메일이 두 번 나간다.
     *
     * @return 차지한 행 수(0 또는 1)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SentMail m set m.dsptchRsltCd = 'Q', m.dsptchDt = :now, m.mdfcnDt = :now, m.lastMdfrId = :loginId "
            + "where m.emlDsptchSn = :emlDsptchSn and m.frstRgtrId = :loginId "
            + "and (m.dsptchRsltCd = 'F' or (m.dsptchRsltCd = 'P' and (m.dsptchDt is null or m.dsptchDt < :stuckBefore)))")
    int claimForResend(@Param("emlDsptchSn") Long emlDsptchSn, @Param("loginId") String loginId,
            @Param("now") java.time.LocalDateTime now, @Param("stuckBefore") java.time.LocalDateTime stuckBefore);

    /** Commit the claim before SMTP; another worker cannot send an uncertain P attempt again. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update SentMail m set m.dsptchRsltCd = 'P', m.mdfcnDt = CURRENT_TIMESTAMP where m.emlDsptchSn = :id "
            + "and m.dsptchRsltCd = 'Q' and m.dsptchDt = :queuedAt")
    int claimQueued(@Param("id") Long id, @Param("queuedAt") java.time.LocalDateTime queuedAt);

    /** A previous attempt's late result cannot replace the next manually accepted attempt. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update SentMail m set m.dsptchRsltCd = :result, m.mdfcnDt = CURRENT_TIMESTAMP where m.emlDsptchSn = :id "
            + "and m.dsptchRsltCd = 'P' and m.dsptchDt = :queuedAt")
    int recordResult(@Param("id") Long id, @Param("queuedAt") java.time.LocalDateTime queuedAt,
            @Param("result") String result);

    // Terminal callbacks share the managed DurableJob: clearing this context would detach its payload cleanup.
    @Modifying(flushAutomatically = true)
    @Query("update SentMail m set m.dsptchRsltCd = 'F', m.mdfcnDt = CURRENT_TIMESTAMP where m.emlDsptchSn = :id "
            + "and m.dsptchRsltCd = 'Q' and m.dsptchDt = :queuedAt")
    int failQueued(@Param("id") Long id, @Param("queuedAt") java.time.LocalDateTime queuedAt);
}
