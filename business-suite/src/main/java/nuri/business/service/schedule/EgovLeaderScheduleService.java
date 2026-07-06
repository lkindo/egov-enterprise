package nuri.business.service.schedule;

import nuri.business.service.schedule.dto.LeaderScheduleDto;
import nuri.business.service.schedule.dto.LeaderStatusDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovLeaderScheduleService {

    Page<LeaderScheduleDto> getLeaderScheduleList(String keyword, Pageable pageable);

    LeaderScheduleDto getLeaderSchedule(String schdlId);

    String createLeaderSchedule(String userId, LeaderScheduleDto dto);

    void updateLeaderSchedule(String schdlId, String userId, LeaderScheduleDto dto);

    void deleteLeaderSchedule(String schdlId);

    // 간부 상태 관리
    Page<LeaderStatusDto> getLeaderStatusList(String searchKeyword, Pageable pageable);

    LeaderStatusDto getLeaderStatus(String leaderId);

    void updateLeaderStatus(LeaderStatusDto dto);
}
