package com.company.project.domain.sanctn;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??뚮뻼野껉퀣??Repository
 */
public interface InformalSanctnRepository extends JpaRepository<InformalSanctn, String> {
    Page<InformalSanctn> findByApplcntId(String applcntId, Pageable pageable);
    Page<InformalSanctn> findBySanctnerId(String sanctnerId, Pageable pageable);
    Page<InformalSanctn> findBySanctnerIdAndConfmAt(String sanctnerId, String confmAt, Pageable pageable);
}
