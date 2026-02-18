package com.company.project.service.system;

import com.company.project.domain.system.*;
import com.company.project.service.system.dto.AnnualLeaveDto;
import com.company.project.service.system.dto.VacationDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service("systemVacationService")
@RequiredArgsConstructor
public class VacationService extends EgovAbstractServiceImpl {

    private final VacationRepository vacationRepository;
    private final AnnualLeaveRepository annualLeaveRepository;

    @Transactional(readOnly = true)
    public Page<VacationDto> getVacationList(String applcntId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return vacationRepository.findByApplcntId(applcntId == null ? "" : applcntId, pageable).map(VacationDto::from);
    }

    @Transactional(readOnly = true)
    public VacationDto getVacation(String applcntId, String vcatnSe, String bgnde) {
        VacationId id = new VacationId(Objects.requireNonNull(applcntId), Objects.requireNonNull(vcatnSe),
                Objects.requireNonNull(bgnde));
        Vacation entity = vacationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vacation record not found"));
        return VacationDto.from(entity);
    }

    @Transactional
    public void applyVacation(VacationDto dto) {
        Vacation entity = Vacation.builder()
                .applcntId(dto.getApplcntId())
                .vcatnSe(dto.getVcatnSe())
                .bgnde(dto.getBgnde())
                .endde(dto.getEndde())
                .reqstDe(dto.getReqstDe())
                .vcatnResn(dto.getVcatnResn())
                .occrrncYear(dto.getOccrrncYear())
                .noonSe(dto.getNoonSe())
                .confmAt("N")
                .build();
        vacationRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateVacation(VacationDto dto) {
        Vacation entity = vacationRepository
                .findById(new VacationId(dto.getApplcntId(), dto.getVcatnSe(), dto.getBgnde()))
                .orElseThrow(() -> new RuntimeException("Vacation record not found"));

        entity.setEndde(dto.getEndde());
        entity.setVcatnResn(dto.getVcatnResn());
        entity.setNoonSe(dto.getNoonSe());
    }

    @Transactional
    public void deleteVacation(String applcntId, String vcatnSe, String bgnde) {
        VacationId id = new VacationId(Objects.requireNonNull(applcntId), Objects.requireNonNull(vcatnSe),
                Objects.requireNonNull(bgnde));
        vacationRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Page<AnnualLeaveDto> getAnnualLeaveList(String occrrncYear, Pageable pageable) {
        return annualLeaveRepository.findByOccrrncYear(occrrncYear == null ? "" : occrrncYear, pageable)
                .map(AnnualLeaveDto::from);
    }

    @Transactional
    public void saveAnnualLeave(AnnualLeaveDto dto) {
        AnnualLeave entity = annualLeaveRepository.findById(new AnnualLeaveId(dto.getOccrrncYear(), dto.getUsid()))
                .orElse(AnnualLeave.builder()
                        .occrrncYear(dto.getOccrrncYear())
                        .usid(dto.getUsid())
                        .build());

        entity.setOccrncYrycCo(dto.getOccrncYrycCo());
        entity.setUseYrycCo(dto.getUseYrycCo());
        entity.setRemndrYrycCo(dto.getRemndrYrycCo());

        annualLeaveRepository.save(Objects.requireNonNull(entity));
    }
}
