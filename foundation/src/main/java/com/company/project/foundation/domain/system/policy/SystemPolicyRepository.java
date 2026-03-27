package com.company.project.foundation.domain.system.policy;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 시스템 정책 리포지토리
 */
@Repository
public interface SystemPolicyRepository extends JpaRepository<SystemPolicy, String> {
}
