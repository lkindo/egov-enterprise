package com.company.project.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FileGroupRepository extends JpaRepository<FileGroup, Long> {
    Optional<FileGroup> findByAtchFileId(String atchFileId);
}
