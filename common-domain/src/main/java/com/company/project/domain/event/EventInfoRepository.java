package com.company.project.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??源???類ｋ궖 Repository
 */
public interface EventInfoRepository extends JpaRepository<EventInfo, String> {
    Page<EventInfo> findByEventCnContaining(String eventCn, Pageable pageable);
    Page<EventInfo> findByChargerNmContaining(String chargerNm, Pageable pageable);
}
