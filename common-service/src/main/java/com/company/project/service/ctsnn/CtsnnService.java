package com.company.project.service.ctsnn;

import com.company.project.domain.ctsnn.Ctsnn;
import com.company.project.domain.ctsnn.CtsnnRepository;
import com.company.project.service.ctsnn.dto.CtsnnDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CtsnnService implements EgovCtsnnService {

    private final CtsnnRepository ctsnnRepository;

    @Override
    public CtsnnDto getCtsnn(String ctsnnId) {
        return ctsnnRepository.findById(ctsnnId)
                .map(this::convertToDto)
                .orElse(null);
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
        ctsnnRepository.save(ctsnn);
    }

    @Override
    @Transactional
    public void updateCtsnn(CtsnnDto dto) {
        ctsnnRepository.findById(dto.getCtsnnId())
                .ifPresent(c -> c.update(dto.getCtsnnCd(), dto.getCtsnnNm(), dto.getReqstDe(), dto.getTrgterNm(),
                        dto.getBrth(), dto.getOccrrDe(), dto.getRelate(), dto.getRemark(), dto.getUsid()));
    }

    @Override
    @Transactional
    public void deleteCtsnn(String ctsnnId) {
        ctsnnRepository.deleteById(ctsnnId);
    }

    @Override
    @Transactional
    public void approveCtsnn(String ctsnnId, String confmAt, String returnResn, String lastUpdusrId) {
        ctsnnRepository.findById(ctsnnId)
                .ifPresent(c -> c.approve(confmAt, returnResn, lastUpdusrId));
    }

    @Override
    public Page<CtsnnDto> getCtsnnList(String searchKeyword, String ctsnnCd, Pageable pageable) {
        return ctsnnRepository.findAll(pageable)
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
