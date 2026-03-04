package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface PrivacyLogRepository
        extends JpaRepository<PrivacyLog, String>, QuerydslPredicateExecutor<PrivacyLog>, PrivacyLogRepositoryCustom {
}
