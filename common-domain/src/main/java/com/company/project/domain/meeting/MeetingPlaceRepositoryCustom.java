package com.company.project.domain.meeting;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 회의실 정보 Repository Custom 인터페이스
 */
public interface MeetingPlaceRepositoryCustom {
    Page<MeetingPlace> searchMeetingPlaces(String keyword, Pageable pageable);
}
