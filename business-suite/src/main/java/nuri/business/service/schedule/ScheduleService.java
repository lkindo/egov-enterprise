package nuri.business.service.schedule;

import nuri.foundation.core.exception.BusinessException;
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
            map.put("userId", user.getUserId());
            map.put("userNm", user.getUserNm());
            map.put("esntlId", user.getEsntlId());
            map.put("officeTelno", user.getOfficeTelno());
            map.put("homeadres", user.getHomeadres());
            map.put("detailAdres", user.getDetailAdres());
            return map;
        }).collect(Collectors.toList());
    }

    @Override
    public Page<ScheduleDto> getScheduleList(String userId, @org.springframework.lang.NonNull Pageable pageable) {
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
        return scheduleRepository.findOverlappingSchedules(startDate, endDate).stream()
                .map(ScheduleDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public Page<ScheduleDto> getScheduleList(String schdlSeCd, String ownerId,
            @org.springframework.lang.NonNull Pageable pageable) {
        return scheduleRepository.findSchedules(schdlSeCd, ownerId, Objects.requireNonNull(pageable))
                .map(ScheduleDto::from);
    }

    @Override
    public List<ScheduleDto> getScheduleListByDateRange(String schdlSeCd, String ownerId, String startDate,
            String endDate) {
        return scheduleRepository.findSchedulesByRange(schdlSeCd, ownerId, startDate, endDate).stream()
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
        // ID: SCHDUL_ + UUID
        String id = "SCHDUL_" + java.util.UUID.randomUUID().toString().substring(0, 13);

        Schedule schedule = Schedule.builder()
                .schdlId(id)
                .schdlSeCd(dto.getSchdlSeCd())
                .schdlDeptId(dto.getSchdlDeptId())
                .schdlKindCd(dto.getSchdlKindCd())
                .schdlBgngYmd(dto.getSchdlBgngYmd())
                .schdlEndYmd(dto.getSchdlEndYmd())
                .schdlTtl(dto.getSchdlTtl())
                .schdlCn(dto.getSchdlCn())
                .schdlPlcNm(dto.getSchdlPlcNm())
                .schdlIpcrCd(dto.getSchdlIpcrCd())
                .schdlPicId(dto.getSchdlPicId())
                .atchFileId(dto.getAtchFileId())
                .reptitSeCd(dto.getReptitSeCd())
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
                dto.getSchdlSeCd(),
                dto.getSchdlKindCd(),
                dto.getSchdlBgngYmd(),
                dto.getSchdlEndYmd(),
                dto.getSchdlTtl(),
                dto.getSchdlCn(),
                dto.getSchdlPlcNm(),
                dto.getSchdlIpcrCd(),
                dto.getAtchFileId(),
                dto.getReptitSeCd());
    }

    @Override
    @Transactional
    public void deleteSchedule(String id, String userId) {
        Schedule schedule = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(nuri.foundation.core.exception.ErrorCode.RESOURCE_NOT_FOUND));
        scheduleRepository.delete(Objects.requireNonNull(schedule));
    }
}
