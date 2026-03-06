package com.company.project.domain.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HttpMonitoringLogRepository extends JpaRepository<HttpMonitoringLog, String> {
}
