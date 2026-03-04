package com.company.project.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkReportRepository extends JpaRepository<WorkReport, String>, WorkReportRepositoryCustom {
}