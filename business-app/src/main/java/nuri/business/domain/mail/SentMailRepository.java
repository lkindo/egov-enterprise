package nuri.business.domain.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 발송메일 Repository
 */
public interface SentMailRepository extends JpaRepository<SentMail, Long>, SentMailRepositoryCustom {

    Page<SentMail> findByEmlTtlContaining(String emlTtl, Pageable pageable);

    Page<SentMail> findBySndptyNm(String sndptyNm, Pageable pageable);

    Page<SentMail> findByRcvrNm(String rcvrNm, Pageable pageable);

    Page<SentMail> findByDsptchRsltCd(String dsptchRsltCd, Pageable pageable);

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
