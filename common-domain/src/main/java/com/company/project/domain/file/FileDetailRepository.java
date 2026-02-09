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

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(MAX(fd.fileSn), 0) FROM FileDetail fd WHERE fd.fileMaster = :fileMaster")
    Integer findMaxFileSnByFileMaster(@org.springframework.data.repository.query.Param("fileMaster") FileMaster fileMaster);

    org.springframework.data.domain.Page<FileDetail> findByOrignlFileNmContaining(String orignlFileNm,
            org.springframework.data.domain.Pageable pageable);
}
