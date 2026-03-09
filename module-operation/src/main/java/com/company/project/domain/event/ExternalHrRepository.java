package com.company.project.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 외부 인사 정보 Repository
 */
public interface ExternalHrRepository extends JpaRepository<ExternalHr, String> {
    Page<ExternalHr> findByExtrlHrNmContaining(String extrlHrNm, Pageable pageable);
    void deleteByEventId(String eventId);
}
