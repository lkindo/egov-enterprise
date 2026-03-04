package com.company.project.service.schedule;

import com.company.project.service.schedule.dto.LeaderScheduleDto;
import com.company.project.service.schedule.dto.LeaderStatusDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovLeaderScheduleService {

    Page<LeaderScheduleDto> getLeaderScheduleList(String keyword, Pageable pageable);

    LeaderScheduleDto getLeaderSchedule(String scheduleId);

    String createLeaderSchedule(String userId, LeaderScheduleDto dto);

    void updateLeaderSchedule(String scheduleId, String userId, LeaderScheduleDto dto);

    void deleteLeaderSchedule(String scheduleId);

    // 媛꾨? ?곹깭 ???
    Page<LeaderStatusDto> getLeaderStatusList(String searchKeyword, Pageable pageable);

    LeaderStatusDto getLeaderStatus(String leaderId);

    void updateLeaderStatus(LeaderStatusDto dto);
}