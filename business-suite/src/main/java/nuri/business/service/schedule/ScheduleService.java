package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService extends BaseAbstractService implements EgovScheduleService {

    private final ScheduleRepository scheduleRepository;

    @Override
    public Page<ScheduleDto> getScheduleList(String userId, @NonNull Pageable pageable) {
        return scheduleRepository.searchSchedules(null, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public Page<ScheduleDto> getScheduleList(String schdlSeCd, String ownerId, @NonNull Pageable pageable) {
        return scheduleRepository.searchSchedules(schdlSeCd, ownerId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public List<ScheduleDto> getMonthlySchedule(String userId, String yearMonth) {
        return scheduleRepository.findMonthlySchedules(userId, yearMonth).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ScheduleDto> getScheduleListByDateRange(String userId, String startDate, String endDate) {
        return scheduleRepository.findSchedulesByDateRange(userId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ScheduleDto> getScheduleListByDateRange(String schdlSeCd, String ownerId, String startDate, String endDate) {
        return scheduleRepository.findSchedulesByDateRange(schdlSeCd, ownerId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public ScheduleDto getSchedule(@NonNull String schdlId) {
        return scheduleRepository.findById(schdlId)
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createSchedule(String userId, ScheduleDto dto) {
        Schedule entity = Schedule.builder()
                .schdlId(dto.getSchdlId())
                .schdlSeCd(dto.getSchdlSeCd())
                .schdlDeptId(dto.getSchdlDeptId())
                .schdlKindCd(dto.getSchdlKindCd())
                .schdlTtl(dto.getSchdlTtl())
                .schdlCn(dto.getSchdlCn())
                .schdlBgngYmd(dto.getSchdlBgngYmd())
                .schdlEndYmd(dto.getSchdlEndYmd())
                .schdlPlcNm(dto.getSchdlPlcNm())
                .schdlIpcrCd(dto.getSchdlIpcrCd())
                .schdlPicId(dto.getSchdlPicId())
                .schdlIpAddr(dto.getSchdulIpAdres())
                .reptitSeCd(dto.getReptitSeCd())
                .atchFileId(dto.getAtchFileId())
                .createdBy(userId)
                .build();
        scheduleRepository.save(entity);
        return entity.getSchdlId();
    }

    @Override
    @Transactional
    public void updateSchedule(String id, String userId, ScheduleDto dto) {
        Schedule entity = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.updateAll(
                dto.getSchdlTtl(),
                dto.getSchdlCn(),
                dto.getSchdlSeCd(),
                dto.getSchdlKindCd(),
                dto.getSchdlBgngYmd(),
                dto.getSchdlEndYmd(),
                dto.getSchdlPlcNm(),
                dto.getSchdlIpcrCd(),
                dto.getSchdlPicId(),
                dto.getReptitSeCd());
        
        entity.setLastModifiedBy(userId);
    }

    @Override
    @Transactional
    public void deleteSchedule(@NonNull String schdlId, String userId) {
        Schedule entity = scheduleRepository.findById(schdlId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (userId != null && !userId.equals(entity.getCreatedBy())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        scheduleRepository.delete(entity);
    }

    @Override
    public List<java.util.Map<String, Object>> selectEmpLyrPopup(@NonNull nuri.foundation.domain.common.BaseSearchDto searchVO) {
        return java.util.Collections.emptyList();
    }

    private ScheduleDto convertToDto(Schedule entity) {
        return ScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .schdulSe(entity.getSchdlSeCd())
                .schdlTtl(entity.getSchdlTtl())
                .schdlCn(entity.getSchdlCn())
                .reptitSeCode(entity.getReptitSeCd())
                .schdlBgngYmd(entity.getSchdlBgngYmd())
                .schdlEndYmd(entity.getSchdlEndYmd())
                .schdulIpAdres(entity.getSchdlIpAddr())
                .schdulChargerId(entity.getSchdlPicId())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .modifiedDate(entity.getLastModifiedDate())
                .build();
    }
}
