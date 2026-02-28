package com.company.project.service.holiday;

import com.company.project.service.holiday.dto.HolidayDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface HolidayService {
    Page<HolidayDto> getHolidayList(String keyword, Pageable pageable);

    List<HolidayDto> getHolidaysByYearMonth(String year, String month);

    HolidayDto getHoliday(Integer restdeNo);

    Integer createHoliday(String userId, HolidayDto dto);

    void updateHoliday(Integer restdeNo, String userId, HolidayDto dto);

    void deleteHoliday(Integer restdeNo);
}
