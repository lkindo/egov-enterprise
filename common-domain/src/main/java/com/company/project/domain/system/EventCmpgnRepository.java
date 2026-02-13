package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventCmpgnRepository extends JpaRepository<EventCmpgn, String> {
    Page<EventCmpgn> findByEventCnContaining(String eventCn, Pageable pageable);
}
