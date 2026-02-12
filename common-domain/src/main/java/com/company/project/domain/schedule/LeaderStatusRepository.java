package com.company.project.domain.schedule;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 간부 상태 Repository
 */
public interface LeaderStatusRepository extends JpaRepository<LeaderStatus, String> {
}
