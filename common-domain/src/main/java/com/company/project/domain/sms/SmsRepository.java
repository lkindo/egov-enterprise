package com.company.project.domain.sms;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * SMS Repository
 */
public interface SmsRepository extends JpaRepository<Sms, String>, SmsRepositoryCustom {

    Page<Sms> findByTrnsmitCnContaining(String keyword, Pageable pageable);

    Page<Sms> findByUniqId(String uniqId, Pageable pageable);
}
