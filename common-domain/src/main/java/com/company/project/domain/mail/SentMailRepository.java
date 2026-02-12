package com.company.project.domain.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 발송메일 Repository
 */
public interface SentMailRepository extends JpaRepository<SentMail, String>, SentMailRepositoryCustom {

    Page<SentMail> findBySjContaining(String sj, Pageable pageable);

    Page<SentMail> findByDsptchPerson(String dsptchPerson, Pageable pageable);

    Page<SentMail> findByRecptnPerson(String recptnPerson, Pageable pageable);

    Page<SentMail> findBySndngResultCode(String sndngResultCode, Pageable pageable);
}
