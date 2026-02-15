package com.company.project.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 행사관리 Repository
 */
@org.springframework.stereotype.Repository("evtEventRepository")
public interface EventRepository extends JpaRepository<Event, String> {
    Page<Event> findByEventNmContaining(String eventNm, Pageable pageable);
}
