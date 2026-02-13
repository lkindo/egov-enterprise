package com.company.project.service.vct;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.notification.*;
import com.company.project.domain.vct.*;
import com.company.project.service.vct.dto.UserAbsenceDto;
import com.company.project.service.vct.dto.VacationDto;
import com.company.project.service.vct.dto.YearlyLeaveDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VacationServiceImpl implements VacationService {

    private final VcatnManageRepository vacationRepository;
    private final IndvdlYrycManageRepository yearlyLeaveRepository;
    private final UserAbsenceDomainRepository userAbsenceRepository;

    @Override
    public Page<VacationDto> getVacationList(String userId, String searchWrd, Pageable pageable) {
        return vacationRepository.findAll(pageable).map(VacationDto::from);
    }

    @Override
    public VacationDto getVacation(String applcntId, String vcatnSe, String bgnde) {
        VcatnManageId id = new VcatnManageId(applcntId, vcatnSe, bgnde);
        return vacationRepository.findById(id)
                .map(VacationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void requestVacation(String userId, VacationDto dto) {
        VcatnManage entity = VcatnManage.builder()
                .applcntId(userId)
                .vcatnSe(dto.getVcatnSe())
                .bgnde(dto.getBgnde())
                .endde(dto.getEndde())
                .vcatnResn(dto.getVcatnResn())
                .reqstDe(dto.getReqstDe())
                .occrrncYear(dto.getOccrrncYear())
                .noonSe(dto.getNoonSe())
                .confmAt("R")
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .frstRegisterId(userId)
                .build();
        vacationRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateVacation(String userId, VacationDto dto) {
        VcatnManageId id = new VcatnManageId(dto.getApplcntId(), dto.getVcatnSe(), dto.getBgnde());
        VcatnManage entity = vacationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getVcatnResn(), userId);
    }

    @Override
    @Transactional
    public void deleteVacation(String applcntId, String vcatnSe, String bgnde) {
        VcatnManageId id = new VcatnManageId(applcntId, vcatnSe, bgnde);
        if (!vacationRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        vacationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void confirmVacation(String userId, String applcntId, String vcatnSe, String bgnde, String confmAt,
            String returnResn) {
        VcatnManageId id = new VcatnManageId(applcntId, vcatnSe, bgnde);
        VcatnManage entity = vacationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.confirm(confmAt, LocalDateTime.now(), returnResn, userId);
    }

    @Override
    public List<YearlyLeaveDto> getYearlyLeaveList(String occrrncYear, String searchWrd) {
        return yearlyLeaveRepository.findAll().stream()
                .filter(e -> occrrncYear.equals(e.getOccrrncYear()))
                .map(YearlyLeaveDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public YearlyLeaveDto getYearlyLeave(String occrrncYear, String userId) {
        IndvdlYrycManageId id = new IndvdlYrycManageId(occrrncYear, userId);
        return yearlyLeaveRepository.findById(id)
                .map(YearlyLeaveDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void saveYearlyLeave(String userId, YearlyLeaveDto dto) {
        IndvdlYrycManageId id = new IndvdlYrycManageId(dto.getOccrrncYear(), dto.getUserId());
        yearlyLeaveRepository.findById(id).ifPresentOrElse(
                entity -> entity.update(dto.getUseYrycCo(), dto.getRemndrYrycCo(), userId),
                () -> {
                    IndvdlYrycManage entity = IndvdlYrycManage.builder()
                            .occrrncYear(dto.getOccrrncYear())
                            .userId(dto.getUserId())
                            .yrycOccrrncCo(dto.getYrycOccrrncCo())
                            .useYrycCo(dto.getUseYrycCo())
                            .remndrYrycCo(dto.getRemndrYrycCo())
                            .frstRegisterId(userId)
                            .build();
                    yearlyLeaveRepository.save(entity);
                });
    }

    @Override
    public Page<UserAbsenceDto> getUserAbsenceList(String searchWrd, Pageable pageable) {
        return userAbsenceRepository.findAll(pageable).map(UserAbsenceDto::from);
    }

    @Override
    public UserAbsenceDto getUserAbsence(String userId) {
        return userAbsenceRepository.findById(userId)
                .map(UserAbsenceDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void saveUserAbsence(String userId, UserAbsenceDto dto) {
        userAbsenceRepository.findById(dto.getUserId()).ifPresentOrElse(
                entity -> entity.updateAbsence(dto.getUserAbsnceAt(), userId),
                () -> {
                    UserAbsenceVct entity = UserAbsenceVct.builder()
                            .userId(dto.getUserId())
                            .userAbsnceAt(dto.getUserAbsnceAt())
                            .frstRegisterId(userId)
                            .lastUpdusrId(userId)
                            .build();
                    userAbsenceRepository.save(entity);
                });
    }

    @Override
    @Transactional
    public void deleteUserAbsence(String userId) {
        if (!userAbsenceRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        userAbsenceRepository.deleteById(userId);
    }
}
