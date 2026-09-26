package nuri.business.domain.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 발송메일 Repository
 */
public interface SentMailRepository extends JpaRepository<SentMail, Long>, SentMailRepositoryCustom {

    Page<SentMail> findByEmlTtlContaining(String emlTtl, Pageable pageable);

    Page<SentMail> findBySndptyNm(String sndptyNm, Pageable pageable);

    Page<SentMail> findByRcvrNm(String rcvrNm, Pageable pageable);

    Page<SentMail> findByDsptchRsltCd(String dsptchRsltCd, Pageable pageable);

    /**
     * 재발송 차지(2026-09-26 DIP B5 F7). 발신자 본인의 메일이 실패('F')했거나 대기('P')에 {@code stuckBefore} 전부터
     * 멈춰 있을 때만 대기로 되돌리고 발송 시각을 지금으로 바꾼다. 한 번의 UPDATE 라 두 번 누른 재발송은 하나만 이긴다 —
     * 진행 중인 대기 건을 다시 보내면 같은 메일이 두 번 나간다.
     *
     * @return 차지한 행 수(0 또는 1)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SentMail m set m.dsptchRsltCd = 'P', m.dsptchDt = :now, m.mdfcnDt = :now, m.lastMdfrId = :loginId "
            + "where m.emlDsptchSn = :emlDsptchSn and m.frstRgtrId = :loginId "
            + "and (m.dsptchRsltCd = 'F' or (m.dsptchRsltCd = 'P' and (m.dsptchDt is null or m.dsptchDt < :stuckBefore)))")
    int claimForResend(@Param("emlDsptchSn") Long emlDsptchSn, @Param("loginId") String loginId,
            @Param("now") java.time.LocalDateTime now, @Param("stuckBefore") java.time.LocalDateTime stuckBefore);

    // ----- [Legacy Query Method Bridges] -----
    default Page<SentMail> findBySjContaining(String sj, Pageable pageable) {
        return findByEmlTtlContaining(sj, pageable);
    }

    default Page<SentMail> findByDsptchPerson(String dsptchPerson, Pageable pageable) {
        return findBySndptyNm(dsptchPerson, pageable);
    }

    default Page<SentMail> findByRecptnPerson(String recptnPerson, Pageable pageable) {
        return findByRcvrNm(recptnPerson, pageable);
    }

    default Page<SentMail> findBySndngResultCode(String sndngResultCode, Pageable pageable) {
        return findByDsptchRsltCd(sndngResultCode, pageable);
    }
}
