package com.company.project.service.hld;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.holiday.Holiday;
import com.company.project.domain.holiday.HolidayRepository;
import com.company.project.service.hld.dto.HolidayDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HolidayServiceImpl implements HolidayService {

    private final HolidayRepository holidayRepository;

    @Override
    public Page<HolidayDto> getHolidayList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return holidayRepository.findAll(pageable).map(HolidayDto::from);
        }
        return holidayRepository.findByRestdeNmContaining(keyword, pageable).map(HolidayDto::from);
    }

    @Override
    public List<HolidayDto> getHolidaysByYearMonth(String year, String month) {
        String yearMonth = year + month;
        return holidayRepository.findByYearMonth(yearMonth).stream()
                .map(HolidayDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public HolidayDto getHoliday(Integer restdeNo) {
        return holidayRepository.findById(Objects.requireNonNull(restdeNo))
                .map(HolidayDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public Integer createHoliday(String userId, HolidayDto dto) {
        Holiday holiday = Holiday.builder()
                .restdeDe(dto.getRestdeDe())
                .restdeNm(dto.getRestdeNm())
                .restdeDc(dto.getRestdeDc())
                .restdeSe(dto.getRestdeSe())
                .restdeSeCode(dto.getRestdeSeCode())
                .frstRegisterId(userId)
                .build();

        Holiday saved = Objects.requireNonNull(holidayRepository.save(Objects.requireNonNull(holiday)));
        return saved.getRestdeNo();
    }

    @Override
    @Transactional
    public void updateHoliday(Integer restdeNo, String userId, HolidayDto dto) {
        Holiday holiday = holidayRepository.findById(Objects.requireNonNull(restdeNo))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        holiday.update(dto.getRestdeDe(), dto.getRestdeNm(), dto.getRestdeDc(),
                dto.getRestdeSe(), dto.getRestdeSeCode(), userId);
    }

    @Override
    @Transactional
    public void deleteHoliday(Integer restdeNo) {
        if (!holidayRepository.existsById(Objects.requireNonNull(restdeNo))) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        holidayRepository.deleteById(Objects.requireNonNull(restdeNo));
    }
}
