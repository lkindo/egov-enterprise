package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import com.company.project.domain.code.ZipCode.ZipCodeId;

public interface ZipCodeRepository extends JpaRepository<ZipCode, ZipCodeId> {
}
