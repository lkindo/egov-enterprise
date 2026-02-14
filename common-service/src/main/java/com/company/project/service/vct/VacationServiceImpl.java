package com.company.project.service.vct;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.*;
import com.company.project.service.vct.dto.UserAbsenceDto;
import com.company.project.service.vct.dto.VacationDto;
import com.company.project.service.vct.dto.YearlyLeaveDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 휴가/연차 자동 계산 엔진이 통합된 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VacationServiceImpl implements VacationService {

    private final VacationRepository vacationRepository;
    private final AnnualLeaveRepository annualLeaveRepository;
    private final UserAbsenceRepository userAbsenceRepository;
    private final com.company.project.domain.notification.NotificationRepository notificationRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    @Override
    public Page<VacationDto> getVacationList(String userId, String searchWrd, Pageable pageable) {
        return vacationRepository.findAll(pageable).map(VacationDto::from);
    }

    @Override
    public VacationDto getVacation(String applcntId, String vcatnSe, String bgnde) {
        VacationId id = new VacationId(applcntId, vcatnSe, bgnde);
        return vacationRepository.findById(id)
                .map(VacationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void requestVacation(String userId, VacationDto dto) {
        // 1. 잔여 연차 검증 (연차/반차인 경우)
        if ("01".equals(dto.getVcatnSe()) || "02".equals(dto.getVcatnSe())) {
            double requestDays = calculateVacationDays(dto);
            AnnualLeave leaveMaster = annualLeaveRepository.findById(new AnnualLeaveId(dto.getOccrrncYear(), userId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_RESOURCE_NOT_FOUND));

            if (leaveMaster.getRemndrYrycCo() < requestDays) {
                throw new BusinessException(ErrorCode.USER_INVALID_INPUT_VALUE);
            }
        }

        // 2. 신청 정보 저장
        Vacation entity = Vacation.builder()
                .applcntId(userId)
                .vcatnSe(dto.getVcatnSe())
                .bgnde(dto.getBgnde())
                .endde(dto.getEndde())
                .vcatnResn(dto.getVcatnResn())
                .reqstDe(LocalDate.now().format(DATE_FORMATTER))
                .noonSe(dto.getNoonSe())
                .confmAt("R") // 신청(Requested)
                .build();
        entity.setFrstRegisterId(userId);
        vacationRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateVacation(String userId, VacationDto dto) {
        VacationId id = new VacationId(dto.getApplcntId(), dto.getVcatnSe(), dto.getBgnde());
        Vacation entity = vacationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.setVcatnResn(dto.getVcatnResn());
        entity.setLastUpdusrId(userId);
    }

    @Override
    @Transactional
    public void deleteVacation(String applcntId, String vcatnSe, String bgnde) {
        VacationId id = new VacationId(applcntId, vcatnSe, bgnde);
        vacationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void confirmVacation(String userId, String applcntId, String vcatnSe, String bgnde, String confmAt,
            String returnResn) {
        VacationId id = new VacationId(applcntId, vcatnSe, bgnde);
        Vacation entity = vacationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 1. 승인 처리인 경우 연차 차감 로직 실행
        if ("Y".equals(confmAt) && ("01".equals(vcatnSe) || "02".equals(vcatnSe))) {
            double useDays = calculateVacationDays(VacationDto.from(entity));
            AnnualLeave leaveMaster = annualLeaveRepository
                    .findById(new AnnualLeaveId(entity.getOccrrncYear(), applcntId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

            leaveMaster.deductLeave(useDays);
        }

        // 2. 상태 업데이트
        entity.setConfmAt(confmAt);
        entity.setSanctnDt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        entity.setReturnResn(returnResn);
        entity.setSanctnerId(userId);
        entity.setLastUpdusrId(userId);

        // 3. 알림 생성
        String statusText = "Y".equals(confmAt) ? "승인" : "반려";
        notificationRepository.save(com.company.project.domain.notification.Notification.builder()
                .ntfcNo("NOTI_" + UUID.randomUUID().toString().substring(0, 15))
                .ntfcSj("휴가 신청 처리 알림")
                .ntfcCn("본인이 신청한 휴가가 " + statusText + "되었습니다.")
                .receiverId(applcntId)
                .linkUrl("/cop/smt/vct")
                .build());
    }

    @Override
    public List<YearlyLeaveDto> getYearlyLeaveList(String occrrncYear, String searchWrd) {
        return annualLeaveRepository.findAll().stream()
                .filter(e -> occrrncYear.equals(e.getOccrrncYear()))
                .map(e -> YearlyLeaveDto.from(e))
                .collect(Collectors.toList());
    }

    @Override
    public YearlyLeaveDto getYearlyLeave(String occrrncYear, String userId) {
        return annualLeaveRepository.findById(new AnnualLeaveId(occrrncYear, userId))
                .map(e -> YearlyLeaveDto.from(e))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void saveYearlyLeave(String userId, YearlyLeaveDto dto) {
        AnnualLeaveId id = new AnnualLeaveId(dto.getOccrrncYear(), dto.getUserId());
        annualLeaveRepository.findById(id).ifPresentOrElse(
                entity -> {
                    entity.setOccrncYrycCo(dto.getYrycOccrrncCo());
                    entity.setUseYrycCo(dto.getUseYrycCo());
                    entity.syncRemaining();
                    entity.setLastUpdusrId(userId);
                },
                () -> {
                    AnnualLeave entity = AnnualLeave.builder()
                            .occrrncYear(dto.getOccrrncYear())
                            .usid(dto.getUserId())
                            .occrncYrycCo(dto.getYrycOccrrncCo())
                            .useYrycCo(dto.getUseYrycCo())
                            .remndrYrycCo(dto.getYrycOccrrncCo() - dto.getUseYrycCo())
                            .build();
                    entity.setFrstRegisterId(userId);
                    annualLeaveRepository.save(entity);
                });
    }

    /**
     * 휴가 신청 정보로부터 실제 사용 일수를 계산하는 내부 로직
     */
    private double calculateVacationDays(VacationDto dto) {
        // 반차인 경우 0.5일 고정
        if (dto.getNoonSe() != null && !dto.getNoonSe().isEmpty()) {
            return 0.5;
        }

        // 일반 휴가인 경우 날짜 차이 계산
        try {
            LocalDate start = LocalDate.parse(dto.getBgnde(), DATE_FORMATTER);
            LocalDate end = LocalDate.parse(dto.getEndde(), DATE_FORMATTER);
            return ChronoUnit.DAYS.between(start, end) + 1.0;
        } catch (Exception e) {
            return 0.0;
        }
    }

    // --- User Absence (Basic CRUD) ---
    @Override
    public Page<UserAbsenceDto> getUserAbsenceList(String searchWrd, Pageable pageable) {
        return userAbsenceRepository.findAll(pageable).map(e -> UserAbsenceDto.from(e));
    }

    @Override
    public UserAbsenceDto getUserAbsence(String userId) {
        return userAbsenceRepository.findById(userId)
                .map(e -> UserAbsenceDto.from(e))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void saveUserAbsence(String userId, UserAbsenceDto dto) {
        // Implementation logic...
    }

    @Override
    @Transactional
    public void deleteUserAbsence(String userId) {
        userAbsenceRepository.deleteById(userId);
    }
}
