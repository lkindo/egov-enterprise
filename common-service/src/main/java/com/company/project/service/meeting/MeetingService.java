package com.company.project.service.meeting;

import com.company.project.service.meeting.dto.MeetingManageDto;
import com.company.project.service.meeting.dto.MeetingPlaceDto;
import com.company.project.service.meeting.dto.MeetingReservationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MeetingService {

    // Meeting Place
    Page<MeetingPlaceDto> getMeetingPlaceList(String keyword, Pageable pageable);

    MeetingPlaceDto getMeetingPlace(String mtgPlaceId);

    String createMeetingPlace(String userId, MeetingPlaceDto dto);

    void updateMeetingPlace(String mtgPlaceId, String userId, MeetingPlaceDto dto);

    void deleteMeetingPlace(String mtgPlaceId);

    // Meeting Reservation
    Page<MeetingReservationDto> getMeetingReservationList(String keyword, Pageable pageable);

    MeetingReservationDto getMeetingReservation(String resveId);

    String reserveMeetingPlace(String userId, MeetingReservationDto dto);

    void updateMeetingReservation(String resveId, String userId, MeetingReservationDto dto);

    void cancelMeetingReservation(String resveId);

    int checkReservationConflict(String mtgPlaceId, String resveDe, String startTime, String endTime,
            String excludeResveId);

    // Meeting Manage
    Page<MeetingManageDto> getMeetingList(String keyword, Pageable pageable);

    MeetingManageDto getMeeting(String mtgId);

    void insertMeeting(MeetingManageDto dto);

    void updateMeeting(MeetingManageDto dto);

    void deleteMeeting(String mtgId);
}
