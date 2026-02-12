package com.company.project.service.meeting;

import com.company.project.service.meeting.dto.MeetingManageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovMeetingService {
    Page<MeetingManageDto> getMeetingList(String keyword, Pageable pageable);
    MeetingManageDto getMeeting(String mtgId);
    void insertMeeting(MeetingManageDto dto);
    void updateMeeting(MeetingManageDto dto);
    void deleteMeeting(String mtgId);
}
