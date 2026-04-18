package nuri.business.service.schedule;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.foundation.domain.common.BaseSearchDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService implements EgovScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final UserRepository userRepository;

    @Override
    public List<Map<String, Object>> selectEmpLyrPopup(@org.springframework.lang.NonNull BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageSize());
        Page<User> users = userRepository.searchUsers(null, searchVO.getSearchCondition(), searchVO.getSearchKeyword(),
                Objects.requireNonNull(pageable));

        return users.getContent().stream().map(user -> {
            Map<String, Object> map = new HashMap<>();
            map.put("emplyrId", user.getUserId());
            map.put("userNm", user.getUserNm());
            map.put("esntlId", user.getEsntlId());
            map.put("offmTelno", user.getOffmTelno());
            map.put("homeadres", user.getHomeadres());
            map.put("detailAdres", user.getDetailAdres());
            return map;
        }).collect(Collectors.toList());
    }

    @Override
    public Page<ScheduleDto> getScheduleList(String userId, @org.springframework.lang.NonNull Pageable pageable) {
        // userId가 null일 때는 전체 조회 or 본인 것만?
        // eGov standard logic: usually lists schedules or own schedules.
        // Assuming strict dept scope, but for step 1, let's filter by
        // register/charger.
        // For simplicity, implement findByFrstRegisterId (My Schedules).

        if (userId == null) {
            return scheduleRepository.findAll(Objects.requireNonNull(pageable)).map(ScheduleDto::from);
        }
        return scheduleRepository.findByFrstRegisterId(userId, Objects.requireNonNull(pageable))
                .map(ScheduleDto::from);
    }

    @Override
    public List<ScheduleDto> getMonthlySchedule(String userId, String yearMonth) {
        String start = yearMonth + "010000";
        String end = yearMonth + "312359";
        return scheduleRepository.findOverlappingSchedules(start, end).stream()
                .map(ScheduleDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public List<ScheduleDto> getScheduleListByDateRange(String userId, String startDate, String endDate) {
        // Legacy Default: Individual (Scope handling might need update if userId is
        // used for Dept)
        // For now, assume this finds ALL overlapping schedules logic in repository was
        // generic.
        // It's safer to redirect to scoped method if possible, but let's leave it as
        // "generic" overlap for now?
        // Actually, previous impl used findOverlappingSchedules which had NO owner
        // filter.
        return scheduleRepository.findOverlappingSchedules(startDate, endDate).stream()
                .map(ScheduleDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public Page<ScheduleDto> getScheduleList(String schdulSe, String ownerId,
            @org.springframework.lang.NonNull Pageable pageable) {
        return scheduleRepository.findSchedules(schdulSe, ownerId, Objects.requireNonNull(pageable))
                .map(ScheduleDto::from);
    }

    @Override
    public List<ScheduleDto> getScheduleListByDateRange(String schdulSe, String ownerId, String startDate,
            String endDate) {
        return scheduleRepository.findSchedulesByRange(schdulSe, ownerId, startDate, endDate).stream()
                .map(ScheduleDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public ScheduleDto getSchedule(String id) {
        Schedule schedule = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(nuri.foundation.core.exception.ErrorCode.RESOURCE_NOT_FOUND));
        return ScheduleDto.from(schedule);
    }

    @Override
    @Transactional
    public String createSchedule(String userId, ScheduleDto dto) {
        // ID: SCHDUL_ + timestamp
        String id = "SCHDUL_" + System.currentTimeMillis();

        Schedule schedule = Schedule.builder()
                .schdulId(id)
                .schdulSe(dto.getSchdulSe())
                .schdulDeptId(dto.getSchdulDeptId())
                .schdulKindCode(dto.getSchdulKindCode())
                .schdulBgnde(dto.getSchdulBgnde())
                .schdulEndde(dto.getSchdulEndde())
                .schdulNm(dto.getSchdulNm())
                .schdulCn(dto.getSchdulCn())
                .schdulPlace(dto.getSchdulPlace())
                .schdulIpcrCode(dto.getSchdulIpcrCode())
                .schdulChargerId(dto.getSchdulChargerId())
                .atchFileId(dto.getAtchFileId())
                .reptitSeCode(dto.getReptitSeCode())
                .build();

        scheduleRepository.save(schedule);
        return id;
    }

    @Override
    @Transactional
    public void updateSchedule(String id, String userId, ScheduleDto dto) {
        Schedule schedule = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(nuri.foundation.core.exception.ErrorCode.RESOURCE_NOT_FOUND));

        schedule.update(
                dto.getSchdulSe(),
                dto.getSchdulKindCode(),
                dto.getSchdulBgnde(),
                dto.getSchdulEndde(),
                dto.getSchdulNm(),
                dto.getSchdulCn(),
                dto.getSchdulPlace(),
                dto.getSchdulIpcrCode(),
                dto.getAtchFileId(),
                dto.getReptitSeCode());
    }

    @Override
    @Transactional
    public void deleteSchedule(String id, String userId) {
        Schedule schedule = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(nuri.foundation.core.exception.ErrorCode.RESOURCE_NOT_FOUND));
        scheduleRepository.delete(Objects.requireNonNull(schedule));
    }
}
