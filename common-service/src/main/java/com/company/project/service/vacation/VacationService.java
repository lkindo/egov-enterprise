package com.company.project.service.vacation;

import com.company.project.domain.vacation.Vacation;
import com.company.project.domain.vacation.VacationRepository;
import com.company.project.service.vacation.dto.VacationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VacationService implements EgovVacationService {

    private final VacationRepository vacationRepository;

    @Override
    public VacationDto getVacation(String applcntId, String vcatnSe, String bgnde) {
        return vacationRepository.findById(new Vacation.VacationId(applcntId, vcatnSe, bgnde))
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerVacation(VacationDto dto) {
        Vacation vacation = Vacation.builder()
                .id(new Vacation.VacationId(dto.getApplcntId(), dto.getVcatnSe(), dto.getBgnde()))
                .endde(dto.getEndde())
                .reqstDe(dto.getReqstDe())
                .vcatnResn(dto.getVcatnResn())
                .occrrncYear(dto.getOccrrncYear())
                .noonSe(dto.getNoonSe())
                .confmAt("R") // Default: Request
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .frstRegisterId(dto.getApplcntId())
                .lastUpdusrId(dto.getApplcntId())
                .build();
        vacationRepository.save(vacation);
    }

    @Override
    @Transactional
    public void updateVacation(VacationDto dto) {
        vacationRepository.findById(new Vacation.VacationId(dto.getApplcntId(), dto.getVcatnSe(), dto.getBgnde()))
                .ifPresent(v -> {
                    // Manual update logic
                });
    }

    @Override
    @Transactional
    public void deleteVacation(String applcntId, String vcatnSe, String bgnde) {
        vacationRepository.deleteById(new Vacation.VacationId(applcntId, vcatnSe, bgnde));
    }

    @Override
    @Transactional
    public void approveVacation(String applcntId, String vcatnSe, String bgnde, String sanctnerId, String confmAt,
            String returnResn, String lastUpdusrId) {
        vacationRepository.findById(new Vacation.VacationId(applcntId, vcatnSe, bgnde))
                .ifPresent(v -> v.approve(sanctnerId, confmAt, returnResn, lastUpdusrId));
    }

    @Override
    public Page<VacationDto> getVacationList(String applcntId, Pageable pageable) {
        return vacationRepository.findByIdApplcntId(applcntId, pageable).map(this::convertToDto);
    }

    @Override
    public Page<VacationDto> getVacationListConfm(String sanctnerId, String confmAt, Pageable pageable) {
        if (confmAt == null || confmAt.isEmpty()) {
            return vacationRepository.findBySanctnerId(sanctnerId, pageable).map(this::convertToDto);
        }
        return vacationRepository.findBySanctnerIdAndConfmAt(sanctnerId, confmAt, pageable).map(this::convertToDto);
    }

    @Override
    public int checkVacationDuplicate(String applcntId, String bgnde, String endde) {
        return vacationRepository.countDuplicateVacation(applcntId, bgnde, endde);
    }

    private final com.company.project.domain.user.UserRepository userRepository;

    private VacationDto convertToDto(Vacation v) {
        String userNm = "";
        String orgnztNm = ""; // Not available in User entity easily without join
        // Fetch User Name
        userNm = userRepository.findById(v.getId().getApplcntId())
                .map(com.company.project.domain.user.User::getUserNm)
                .orElse("");

        return VacationDto.builder()
                .applcntId(v.getId().getApplcntId())
                .vcatnSe(v.getId().getVcatnSe())
                .bgnde(v.getId().getBgnde())
                .endde(v.getEndde())
                .reqstDe(v.getReqstDe())
                .vcatnResn(v.getVcatnResn())
                .occrrncYear(v.getOccrrncYear())
                .noonSe(v.getNoonSe())
                .sanctnerId(v.getSanctnerId())
                .confmAt(v.getConfmAt())
                .sanctnDt(v.getSanctnDt())
                .returnResn(v.getReturnResn())
                .infrmlSanctnId(v.getInfrmlSanctnId())
                .applcntNm(userNm)
                .orgnztNm(orgnztNm)
                .build();
    }
}
