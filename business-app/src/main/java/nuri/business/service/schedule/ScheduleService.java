package nuri.business.service.schedule;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
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
    private final ScheduleMapper scheduleMapper;

    public Page<ScheduleDto> getScheduleList(String userId, @NonNull Pageable pageable) {
        return scheduleRepository.searchSchedules(null, userId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public Page<ScheduleDto> getScheduleList(String schdlSeCd, String ownerId, @NonNull Pageable pageable) {
        return scheduleRepository.searchSchedules(schdlSeCd, ownerId, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public List<ScheduleDto> getMonthlySchedule(String userId, String yearMonth) {
        return scheduleRepository.findMonthlySchedules(userId, yearMonth).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ScheduleDto> getScheduleListByDateRange(String userId, String startDate, String endDate) {
        return scheduleRepository.findSchedulesByDateRange(userId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ScheduleDto> getScheduleListByDateRange(String schdlSeCd, String ownerId, String startDate, String endDate) {
        return scheduleRepository.findSchedulesByDateRange(schdlSeCd, ownerId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public ScheduleDto getSchedule(@NonNull String schdlId) {
        Schedule entity = scheduleRepository.findById(schdlId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 조회
        return convertToDto(entity);
    }

    @Transactional
    public String createSchedule(String userId, ScheduleDto dto) {
        Schedule entity = Schedule.builder()
                .schdlId(dto.getSchdlId())
                .schdlSeCd(dto.getSchdlSeCd())
                .schdlDeptId(dto.getSchdlDeptId())
                .schdlKndCd(dto.getSchdlKndCd())
                .schdlNm(dto.getSchdlNm())
                .schdlCn(dto.getSchdlCn())
                .schdlBgngYmd(dto.getSchdlBgngYmd())
                .schdlEndYmd(dto.getSchdlEndYmd())
                .schdlPlcNm(dto.getSchdlPlcNm())
                .schdlImprtCd(dto.getSchdlImprtCd())
                .schdlPicId(dto.getSchdlPicId())
                .schdlIpAddr(dto.getSchdlIpAddr())
                .reptSeCd(dto.getReptSeCd())
                .atchFileId(dto.getAtchFileId())
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        scheduleRepository.save(entity);
        return entity.getSchdlId();
    }

    @Transactional
    public void updateSchedule(String id, String userId, ScheduleDto dto) {
        Schedule entity = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 수정

        entity.updateAll(
                dto.getSchdlNm(),
                dto.getSchdlCn(),
                dto.getSchdlSeCd(),
                dto.getSchdlKndCd(),
                dto.getSchdlBgngYmd(),
                dto.getSchdlEndYmd(),
                dto.getSchdlPlcNm(),
                dto.getSchdlImprtCd(),
                dto.getSchdlPicId(),
                dto.getReptSeCd());
        
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteSchedule(@NonNull String schdlId, String userId) {
        Schedule entity = scheduleRepository.findById(schdlId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [IDOR/정체성 수정] 기존 가드는 userId(컨트롤러 esntlId)와 frstRgtrId(loginId)를 비교해 항상 deny-all 이었다.
        // SecurityUtil 이 SecurityContext 에서 loginId 를 읽어 소유자/관리자를 올바로 판정한다.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        scheduleRepository.delete(entity);
    }

    public List<java.util.Map<String, Object>> selectEmpLyrPopup(@NonNull nuri.business.domain.common.BaseSearchDto searchVO) {
        return java.util.Collections.emptyList();
    }

    private ScheduleDto convertToDto(Schedule entity) {
        return scheduleMapper.toDto(entity);
    }
}
