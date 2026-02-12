package com.company.project.domain.dam;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface ProfessionalRepository
                extends JpaRepository<Professional, ProfessionalId>, QuerydslPredicateExecutor<Professional>,
                ProfessionalRepositoryCustom {
        boolean existsBySpeId(String speId);
}
