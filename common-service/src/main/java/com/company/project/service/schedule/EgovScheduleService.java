package com.company.project.service.schedule;

import com.company.project.service.schedule.dto.ScheduleDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovScheduleService {
    Page<ScheduleDto> getScheduleList(String userId, Pageable pageable);

    List<ScheduleDto> getMonthlySchedule(String userId, String yearMonth); // YYYYMM

    List<ScheduleDto> getScheduleListByDateRange(String userId, String startDate, String endDate);

    // New methods for scoped access (Personal / Dept)
    Page<ScheduleDto> getScheduleList(String schdulSe, String ownerId, Pageable pageable);

    List<ScheduleDto> getScheduleListByDateRange(String schdulSe, String ownerId, String startDate, String endDate);

    ScheduleDto getSchedule(String id);

    String createSchedule(String userId, ScheduleDto dto);

    void updateSchedule(String id, String userId, ScheduleDto dto);

    void deleteSchedule(String id, String userId);
}
