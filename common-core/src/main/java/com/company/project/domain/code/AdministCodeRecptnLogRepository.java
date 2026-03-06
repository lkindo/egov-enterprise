package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import com.company.project.domain.code.AdministCodeRecptnLog.AdministCodeRecptnLogId;

public interface AdministCodeRecptnLogRepository extends JpaRepository<AdministCodeRecptnLog, AdministCodeRecptnLogId> {
}
