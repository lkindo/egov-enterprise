package com.company.project.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * ?紐? ?紐껋젾 ?類ｋ궖 Repository
 */
public interface ExternalHrRepository extends JpaRepository<ExternalHr, String> {
    Page<ExternalHr> findByExtrlHrNmContaining(String extrlHrNm, Pageable pageable);
    List<ExternalHr> findByEventId(String eventId);
    void deleteByEventId(String eventId);
}
