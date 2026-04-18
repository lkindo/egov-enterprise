package nuri.business.service.schedule;

import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Map;

public interface EgovScheduleService {
    List<Map<String, Object>> selectEmpLyrPopup(@org.springframework.lang.NonNull BaseSearchDto searchVO);

    Page<ScheduleDto> getScheduleList(String userId, @org.springframework.lang.NonNull Pageable pageable);

    List<ScheduleDto> getMonthlySchedule(String userId, String yearMonth); // YYYYMM

    List<ScheduleDto> getScheduleListByDateRange(String userId, String startDate, String endDate);

    // New methods for scoped access (Personal / Dept)
    Page<ScheduleDto> getScheduleList(String schdulSe, String ownerId,
            @org.springframework.lang.NonNull Pageable pageable);

    List<ScheduleDto> getScheduleListByDateRange(String schdulSe, String ownerId, String startDate, String endDate);

    ScheduleDto getSchedule(String id);

    String createSchedule(String userId, ScheduleDto dto);

    void updateSchedule(String id, String userId, ScheduleDto dto);

    void deleteSchedule(String id, String userId);
}
