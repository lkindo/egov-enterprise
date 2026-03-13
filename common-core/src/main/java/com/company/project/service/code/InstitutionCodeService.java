package com.company.project.service.code;

import com.company.project.domain.code.InstitutionCode;
import com.company.project.repository.code.InstitutionCodeRepository;
import com.company.project.service.code.dto.InstitutionCodeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class InstitutionCodeService {

    private final InstitutionCodeRepository institutionCodeRepository;

    public Page<InstitutionCodeDto> getInstitutionCodeList(String searchWrd, Pageable pageable) {
        Page<InstitutionCode> entities;
        if (searchWrd != null && !searchWrd.isEmpty()) {
            entities = institutionCodeRepository.findByAllInsttNmContaining(searchWrd, pageable);
        } else {
            entities = institutionCodeRepository.findAll(pageable);
        }
        return entities.map(this::convertToDto);
    }

    public InstitutionCodeDto getInstitutionCodeDetail(String code) {
        return institutionCodeRepository.findById(code)
                .map(this::convertToDto)
                .orElse(null);
    }

    private InstitutionCodeDto convertToDto(InstitutionCode entity) {
        return InstitutionCodeDto.builder()
                .insttCode(entity.getInsttCode())
                .allInsttNm(entity.getAllInsttNm())
                .lowestInsttNm(entity.getLowestInsttNm())
                .insttAbrvNm(entity.getInsttAbrvNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .insttOdr(entity.getInsttOdr())
                .bestInsttCode(entity.getBestInsttCode())
                .upperInsttCode(entity.getUpperInsttCode())
                .reprsntInsttCode(entity.getReprsntInsttCode())
                .insttTyLclas(entity.getInsttTyLclas())
                .insttTyMclas(entity.getInsttTyMclas())
                .insttTySclas(entity.getInsttTySclas())
                .telno(entity.getTelno())
                .fxnum(entity.getFxnum())
                .creatDe(entity.getCreatDe())
                .ablDe(entity.getAblDe())
                .ablEnnc(entity.getAblEnnc())
                .build();
    }
}
