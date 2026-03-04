package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import com.company.project.domain.code.AdministCode.AdministCodeId;

public interface AdministCodeRepository extends JpaRepository<AdministCode, AdministCodeId> {
}