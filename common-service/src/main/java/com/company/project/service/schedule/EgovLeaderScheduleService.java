package com.company.project.service.schedule;

import com.company.project.service.schedule.dto.LeaderScheduleDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovLeaderScheduleService {
    void registerLeaderSchedule(LeaderScheduleDto dto);

    void updateLeaderSchedule(LeaderScheduleDto dto);

    void deleteLeaderSchedule(String scheduleId);

    LeaderScheduleDto getLeaderSchedule(String scheduleId);

    Page<LeaderScheduleDto> getLeaderScheduleList(String searchKeyword, Pageable pageable);
}
