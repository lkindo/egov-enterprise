package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

/**
 * 전문가 Repository
 */
public interface ProfessionalRepository
                extends JpaRepository<Professional, ProfessionalId>, QuerydslPredicateExecutor<Professional>,
                ProfessionalRepositoryCustom {
        boolean existsByExpertId(String expertId);
}
