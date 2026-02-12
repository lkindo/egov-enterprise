package com.company.project.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 이벤트 정보 Repository
 */
public interface EventInfoRepository extends JpaRepository<EventInfo, String> {
    Page<EventInfo> findByEventCnContaining(String eventCn, Pageable pageable);
    Page<EventInfo> findByChargerNmContaining(String chargerNm, Pageable pageable);
}
