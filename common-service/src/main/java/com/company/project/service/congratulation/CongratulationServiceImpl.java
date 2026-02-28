package com.company.project.service.congratulation;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.ctsnn.Ctsnn;
import com.company.project.domain.ctsnn.CtsnnRepository;
import com.company.project.service.congratulation.dto.CongratulationDto;
import com.company.project.service.congratulation.dto.CongratulationDto; // Wait, redundant
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CongratulationServiceImpl implements CongratulationService {

    private final CtsnnRepository ctsnnRepository;
    private final EgovIdGnrService egovCtsnnIdGnrService;

    @Override
    public CongratulationDto getCongratulation(@NonNull String congratulationId) {
        return ctsnnRepository.findById(Objects.requireNonNull(congratulationId))
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createCongratulation(String userId, CongratulationDto dto) {
        try {
            String id = egovCtsnnIdGnrService.getNextStringId();
            Ctsnn entity = Ctsnn.builder()
                    .ctsnnId(id)
                    .usid(dto.getUsid())
                    .ctsnnCd(dto.getCtsnnCd())
                    .reqstDe(dto.getReqstDe())
                    .ctsnnNm(dto.getCtsnnNm())
                    .trgterNm(dto.getTrgterNm())
                    .brth(dto.getBrth())
                    .occrrDe(dto.getOccrrDe())
                    .relate(dto.getRelate())
                    .remark(dto.getRemark())
                    .confmAt("R")
                    .frstRegisterId(userId)
                    .lastUpdusrId(userId)
                    .build();
            ctsnnRepository.save(Objects.requireNonNull(entity));
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Congratulation ID", e);
        }
    }

    @Override
    @Transactional
    public void updateCongratulation(String congratulationId, String userId, CongratulationDto dto) {
        ctsnnRepository.findById(Objects.requireNonNull(congratulationId))
                .ifPresent(c -> c.update(dto.getCtsnnCd(), dto.getCtsnnNm(), dto.getReqstDe(), dto.getTrgterNm(),
                        dto.getBrth(), dto.getOccrrDe(), dto.getRelate(), dto.getRemark(), userId));
    }

    @Override
    @Transactional
    public void deleteCongratulation(@NonNull String congratulationId) {
        ctsnnRepository.deleteById(Objects.requireNonNull(congratulationId));
    }

    @Override
    @Transactional
    public void approveCongratulation(@NonNull String congratulationId, String sanctnerId, String confmAt,
            String returnResn) {
        ctsnnRepository.findById(Objects.requireNonNull(congratulationId))
                .ifPresent(c -> c.approve(confmAt, returnResn, sanctnerId));
    }

    @Override
    public Page<CongratulationDto> getCongratulationList(String searchKeyword, @NonNull Pageable pageable) {
        if (searchKeyword == null || searchKeyword.isEmpty()) {
            return ctsnnRepository.findAll(Objects.requireNonNull(pageable))
                    .map(this::convertToDto);
        }
        return ctsnnRepository.findByCtsnnNmContaining(searchKeyword, pageable)
                .map(this::convertToDto);
    }

    private CongratulationDto convertToDto(Ctsnn c) {
        return CongratulationDto.builder()
                .ctsnnId(c.getCtsnnId())
                .usid(c.getUsid())
                .ctsnnCd(c.getCtsnnCd())
                .reqstDe(c.getReqstDe())
                .ctsnnNm(c.getCtsnnNm())
                .trgterNm(c.getTrgterNm())
                .brth(c.getBrth())
                .occrrDe(c.getOccrrDe())
                .relate(c.getRelate())
                .remark(c.getRemark())
                .sanctnerId(c.getSanctnerId())
                .confmAt(c.getConfmAt())
                .sanctnDt(c.getSanctnDt())
                .returnResn(c.getReturnResn())
                .infrmlSanctnId(c.getInfrmlSanctnId())
                .build();
    }
}
