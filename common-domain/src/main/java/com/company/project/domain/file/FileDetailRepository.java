package com.company.project.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 파일 상세 JPA Repository
 */
@Repository
public interface FileDetailRepository extends JpaRepository<FileDetail, FileDetailId> {
    List<FileDetail> findByFileMaster(FileMaster fileMaster);
}
