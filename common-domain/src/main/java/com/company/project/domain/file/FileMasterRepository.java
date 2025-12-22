package com.company.project.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 파일 마스터 JPA Repository
 */
@Repository
public interface FileMasterRepository extends JpaRepository<FileMaster, String> {
}
