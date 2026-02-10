package com.company.project.domain.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DbMonitoringLogRepository extends JpaRepository<DbMonitoringLog, String> {
}
