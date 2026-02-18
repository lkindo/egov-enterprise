package com.company.project.service.ctsnn;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.ctsnn.Ctsnn;
import com.company.project.domain.ctsnn.CtsnnRepository;
import com.company.project.service.ctsnn.dto.CtsnnDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CtsnnService implements EgovCtsnnService {

    private final CtsnnRepository ctsnnRepository;

    @Override
    public CtsnnDto getCtsnn(@NonNull String ctsnnId) {
        return ctsnnRepository.findById(Objects.requireNonNull(ctsnnId))
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void registerCtsnn(CtsnnDto dto) {
        Ctsnn ctsnn = Ctsnn.builder()
                .ctsnnId(dto.getCtsnnId())
                .usid(dto.getUsid())
                .ctsnnCd(dto.getCtsnnCd())
                .reqstDe(dto.getReqstDe())
                .ctsnnNm(dto.getCtsnnNm())
                .trgterNm(dto.getTrgterNm())
                .brth(dto.getBrth())
                .occrrDe(dto.getOccrrDe())
                .relate(dto.getRelate())
                .remark(dto.getRemark())
                .confmAt("R") // Default: Request
                .frstRegisterId(dto.getUsid())
                .lastUpdusrId(dto.getUsid())
                .build();
        ctsnnRepository.save(Objects.requireNonNull(ctsnn));
    }

    @Override
    @Transactional
    public void updateCtsnn(CtsnnDto dto) {
        ctsnnRepository.findById(Objects.requireNonNull(dto.getCtsnnId()))
                .ifPresent(c -> c.update(dto.getCtsnnCd(), dto.getCtsnnNm(), dto.getReqstDe(), dto.getTrgterNm(),
                        dto.getBrth(), dto.getOccrrDe(), dto.getRelate(), dto.getRemark(), dto.getUsid()));
    }

    @Override
    @Transactional
    public void deleteCtsnn(@NonNull String ctsnnId) {
        ctsnnRepository.deleteById(Objects.requireNonNull(ctsnnId));
    }

    @Override
    @Transactional
    public void approveCtsnn(@NonNull String ctsnnId, String confmAt, String returnResn,
            String lastUpdusrId) {
        ctsnnRepository.findById(Objects.requireNonNull(ctsnnId))
                .ifPresent(c -> c.approve(confmAt, returnResn, lastUpdusrId));
    }

    @Override
    public Page<CtsnnDto> getCtsnnList(String searchKeyword, String ctsnnCd,
            @NonNull Pageable pageable) {
        return ctsnnRepository.findAll(Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    private CtsnnDto convertToDto(Ctsnn c) {
        return CtsnnDto.builder()
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
