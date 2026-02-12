package com.company.project.service.mtg;

import com.company.project.service.mtg.dto.MeetingPlaceDto;
import com.company.project.service.mtg.dto.MeetingReservationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MeetingService {
    
    Page<MeetingPlaceDto> getMeetingPlaceList(String keyword, Pageable pageable);
    
    MeetingPlaceDto getMeetingPlace(String mtgPlaceId);
    
    String createMeetingPlace(String userId, MeetingPlaceDto dto);
    
    void updateMeetingPlace(String mtgPlaceId, String userId, MeetingPlaceDto dto);
    
    void deleteMeetingPlace(String mtgPlaceId);
    
    Page<MeetingReservationDto> getMeetingReservationList(String keyword, Pageable pageable);
    
    MeetingReservationDto getMeetingReservation(String resveId);
    
    String reserveMeetingPlace(String userId, MeetingReservationDto dto);
    
    void updateMeetingReservation(String resveId, String userId, MeetingReservationDto dto);
    
    void cancelMeetingReservation(String resveId);
    
    int checkReservationConflict(String mtgPlaceId, String resveDe, String startTime, String endTime, String excludeResveId);
}
