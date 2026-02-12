package com.company.project.domain.meeting;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 회의실관리 Repository
 */
public interface MeetingPlaceRepository extends JpaRepository<MeetingPlace, String>, MeetingPlaceRepositoryCustom {
}
