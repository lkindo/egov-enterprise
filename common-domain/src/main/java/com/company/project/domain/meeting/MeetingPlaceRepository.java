package com.company.project.domain.meeting;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 회의실관리 Repository
 */
public interface MeetingPlaceRepository extends JpaRepository<MeetingPlace, String> {
    Page<MeetingPlace> findByMtgPlaceNmContaining(String mtgPlaceNm, Pageable pageable);
}
