package com.company.project.domain.meeting;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ???벥?????Repository
 */
public interface MeetingPlaceRepository extends JpaRepository<MeetingPlace, String>, MeetingPlaceRepositoryCustom {
}