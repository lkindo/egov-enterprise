package com.company.project.business.domain.help;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ㅼ뵬紐꺿꼻??곷섰 Repository
 */
public interface OnlineManualRepository extends JpaRepository<OnlineManual, String> {
    Page<OnlineManual> findByOnlineMnlNmContaining(String onlineMnlNm, Pageable pageable);
}
