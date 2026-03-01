package com.company.project.service.vacation;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.*;
import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.repository.UserAbsenceRepository;
import com.company.project.service.vacation.dto.UserAbsenceDto;
import com.company.project.service.vacation.dto.VacationDto;
import com.company.project.service.vacation.dto.YearlyLeaveDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ?닿?/?곗감 ?먮룞 怨꾩궛 ?붿쭊???듯빀???쒕퉬??援ы쁽泥?
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
        Objects.requireNonNull(pageable);
        if (userId != null && !userId.isEmpty()) {
            return vacationRepository.findByApplcntId(userId, pageable).map(VacationDto::from);
        }
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
        // 1. ?붿뿬 ?곗감 寃利?(?곗감/諛섏감??寃쎌슦)
        if ("01".equals(dto.getVcatnSe()) || "02".equals(dto.getVcatnSe())) {
            double requestDays = calculateVacationDays(dto);
            AnnualLeave leaveMaster = annualLeaveRepository.findById(new AnnualLeaveId(dto.getOccrrncYear(), userId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_RESOURCE_NOT_FOUND));

            if (leaveMaster.getRemndrYrycCo() < requestDays) {
                throw new BusinessException(ErrorCode.USER_INVALID_INPUT_VALUE);
            }
        }

        // 2. ?좎껌 ?뺣낫 ???
        Vacation entity = Vacation.builder()
                .applcntId(userId)
                .vcatnSe(dto.getVcatnSe())
                .bgnde(dto.getBgnde())
                .endde(dto.getEndde())
                .vcatnResn(dto.getVcatnResn())
                .reqstDe(LocalDate.now().format(DATE_FORMATTER))
                .noonSe(dto.getNoonSe())
                .confmAt("R") // Requested (?좎껌??
                .build();
        entity.setFrstRegisterId(userId);
        vacationRepository.save(Objects.requireNonNull(entity));
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
        vacationRepository.deleteById(Objects.requireNonNull(id));
    }

    @Override
    @Transactional
    public void confirmVacation(String userId, String applcntId, String vcatnSe, String bgnde, String confmAt,
            String returnResn) {
        VacationId id = new VacationId(applcntId, vcatnSe, bgnde);
        Vacation entity = vacationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 1. ?뱀씤 泥섎━??寃쎌슦 ?곗감 李④컧 濡쒖쭅 ?ㅽ뻾
        if ("Y".equals(confmAt) && ("01".equals(vcatnSe) || "02".equals(vcatnSe))) {
            double useDays = calculateVacationDays(VacationDto.from(entity));
            AnnualLeave leaveMaster = annualLeaveRepository
                    .findById(new AnnualLeaveId(entity.getOccrrncYear(), applcntId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

            leaveMaster.deductLeave(useDays);
        }

        // 2. ?곹깭 ?낅뜲?댄듃
        entity.setConfmAt(confmAt);
        entity.setSanctnDt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        entity.setReturnResn(returnResn);
        entity.setSanctnerId(userId);
        entity.setLastUpdusrId(userId);

        // 3. ?뚮┝ ?앹꽦
        String statusText = "Y".equals(confmAt) ? "?뱀씤" : "諛섎젮";
        notificationRepository
                .save(java.util.Objects.requireNonNull(com.company.project.domain.notification.Notification.builder()
                        .ntfcNo("NOTI_" + UUID.randomUUID().toString().substring(0, 15))
                        .ntfcSj("?닿? ?좎껌 泥섎━ ?뚮┝")
                        .ntfcCn("蹂몄씤???좎껌???닿?媛 " + statusText + " ?섏뿀?듬땲??")
                        .receiverId(applcntId)
                        .linkUrl("/vacation")
                        .build()));
    }

    @Override
    public List<YearlyLeaveDto> getYearlyLeaveList(String occrrncYear, String searchWrd) {
        return annualLeaveRepository.findAll().stream()
                .filter(e -> occrrncYear.equals(e.getOccrrncYear()))
                .map(YearlyLeaveDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public YearlyLeaveDto getYearlyLeave(String occrrncYear, String userId) {
        return annualLeaveRepository.findById(new AnnualLeaveId(occrrncYear, userId))
                .map(YearlyLeaveDto::from)
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
                            .userId(dto.getUserId())
                            .occrncYrycCo(dto.getYrycOccrrncCo())
                            .useYrycCo(dto.getUseYrycCo())
                            .remndrYrycCo(dto.getYrycOccrrncCo() - dto.getUseYrycCo())
                            .build();
                    entity.setFrstRegisterId(userId);
                    annualLeaveRepository.save(Objects.requireNonNull(entity));
                });
    }

    /**
     * ?닿? ?좎껌 ?뺣낫濡쒕????ㅼ젣 ?ъ슜 ?쇱닔瑜?怨꾩궛?섎뒗 ?대? 濡쒖쭅
     */
    private double calculateVacationDays(VacationDto dto) {
        // 諛섏감??寃쎌슦 0.5??怨좎젙
        if (dto.getNoonSe() != null && !dto.getNoonSe().isEmpty()) {
            return 0.5;
        }

        // ?쇰컲 ?닿???寃쎌슦 ?좎쭨 李⑥씠 怨꾩궛
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
        Objects.requireNonNull(pageable);
        return userAbsenceRepository.findAll(pageable).map(UserAbsenceDto::from);
    }

    @Override
    public UserAbsenceDto getUserAbsence(String userId) {
        return userAbsenceRepository.findById(Objects.requireNonNull(userId))
                .map(UserAbsenceDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void saveUserAbsence(String userId, UserAbsenceDto dto) {
        UserAbsence entity = userAbsenceRepository.findById(Objects.requireNonNull(dto.getUserId()))
                .orElseGet(() -> UserAbsence.builder()
                        .userId(dto.getUserId())
                        .frstRegisterId(userId)
                        .build());

        entity.update(dto.getUserAbsnceAt(), userId);
        userAbsenceRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteUserAbsence(String userId) {
        userAbsenceRepository.deleteById(Objects.requireNonNull(userId));
    }
}

