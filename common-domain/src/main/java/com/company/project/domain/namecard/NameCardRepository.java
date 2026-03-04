package com.company.project.domain.namecard;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 명함 Repository
 */
public interface NameCardRepository extends JpaRepository<NameCard, String>, NameCardRepositoryCustom {

    Page<NameCard> findByNameContaining(String name, Pageable pageable);

    Page<NameCard> findByCompanyNameContaining(String companyName, Pageable pageable);

    Page<NameCard> findByTargetUserId(String targetUserId, Pageable pageable);
}