package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import com.company.project.domain.code.InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId;

public interface InstitutionCodeRecptnLogRepository
        extends JpaRepository<InstitutionCodeRecptnLog, InstitutionCodeRecptnLogId> {
}
