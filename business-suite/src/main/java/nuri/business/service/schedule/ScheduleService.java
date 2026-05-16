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
public class ScheduleService extends BaseAbstractService {

    private final ScheduleRepository scheduleRepository;

    public Page<ScheduleDto> getScheduleList(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        return scheduleRepository.searchSchedules(searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public List<ScheduleDto> getScheduleList(String searchCondition, String searchKeyword) {
        return scheduleRepository.searchSchedules(searchCondition, searchKeyword, Pageable.unpaged())
                .getContent().stream().map(this::convertToDto).collect(Collectors.toList());
    }

    public ScheduleDto getSchedule(@NonNull String schdlId) {
        return scheduleRepository.findById(schdlId)
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void createSchedule(String userId, ScheduleDto dto) {
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
    }

    @Transactional
    public void updateSchedule(String userId, ScheduleDto dto) {
        Schedule entity = scheduleRepository.findById(Objects.requireNonNull(dto.getSchdlId()))
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

    @Transactional
    public void deleteSchedule(@NonNull String schdlId) {
        scheduleRepository.deleteById(schdlId);
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
