package com.company.project.domain.monitoring;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DbMonitoringRepository extends JpaRepository<DbMonitoring, String> {
}
