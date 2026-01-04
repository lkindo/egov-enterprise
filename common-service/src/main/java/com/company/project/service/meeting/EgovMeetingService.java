package com.company.project.service.meeting;

import com.company.project.service.meeting.dto.MeetingPlaceDto;
import com.company.project.service.meeting.dto.MeetingReservationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 회의실관리 서비스 인터페이스
 */
public interface EgovMeetingService {
    // 회의실 관리
    Page<MeetingPlaceDto> getMeetingPlaceList(String keyword, Pageable pageable);

    MeetingPlaceDto getMeetingPlace(String mtgPlaceId);

    String createMeetingPlace(String userId, MeetingPlaceDto dto);

    void updateMeetingPlace(String mtgPlaceId, String userId, MeetingPlaceDto dto);

    void deleteMeetingPlace(String mtgPlaceId);

    // 회의실 예약
    Page<MeetingReservationDto> getMeetingReservationList(String keyword, Pageable pageable);

    MeetingReservationDto getMeetingReservation(String resveId);

    String reserveMeetingPlace(String userId, MeetingReservationDto dto);

    void updateMeetingReservation(String resveId, String userId, MeetingReservationDto dto);

    void cancelMeetingReservation(String resveId);

    int checkReservationConflict(String mtgPlaceId, String resveDe, String startTime, String endTime,
            String excludeResveId);
}
