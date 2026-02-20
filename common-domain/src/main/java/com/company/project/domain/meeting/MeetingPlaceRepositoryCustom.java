package com.company.project.domain.meeting;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ???벥???類ｋ궖 Repository Custom ?紐낃숲??륁뵠??
 */
public interface MeetingPlaceRepositoryCustom {
    Page<MeetingPlace> searchMeetingPlaces(String keyword, Pageable pageable);
}
