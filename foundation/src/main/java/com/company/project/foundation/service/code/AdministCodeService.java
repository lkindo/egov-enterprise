package com.company.project.foundation.service.code;

import com.company.project.foundation.domain.code.AdministCode;
import com.company.project.foundation.repository.code.AdministCodeRepository;
import com.company.project.foundation.service.code.dto.AdministCodeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdministCodeService {

    private final AdministCodeRepository administCodeRepository;

    public Page<AdministCodeDto> getAdministCodeList(String searchWrd, Pageable pageable) {
        Page<AdministCode> entities;
        if (searchWrd != null && !searchWrd.isEmpty()) {
            entities = administCodeRepository.findByAdministZoneNmContaining(searchWrd, pageable);
        } else {
            entities = administCodeRepository.findAll(pageable);
        }
        return entities.map(this::convertToDto);
    }

    public AdministCodeDto getAdministCodeDetail(String code) {
        return administCodeRepository.findById(code)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Transactional
    public String createAdministCode(AdministCodeDto dto, String userId) {
        AdministCode entity = AdministCode.builder()
                .administZoneCode(dto.getAdministZoneCode())
                .administZoneSe(dto.getAdministZoneSe())
                .administZoneNm(dto.getAdministZoneNm())
                .upperAdministZoneCode(dto.getUpperAdministZoneCode())
                .useAt(dto.getUseAt())
                .creatDe(dto.getCreatDe())
                .createdBy(userId)
                .build();
        return administCodeRepository.save(entity).getAdministZoneCode();
    }

    @Transactional
    public void updateAdministCode(String code, AdministCodeDto dto, String userId) {
        AdministCode entity = administCodeRepository.findById(code)
                .orElseThrow(() -> new IllegalArgumentException("Administrative code not found: " + code));
        entity.update(dto.getAdministZoneSe(), dto.getAdministZoneNm(), dto.getUpperAdministZoneCode(), dto.getUseAt(), userId);
    }

    @Transactional
    public void deleteAdministCode(String code) {
        administCodeRepository.deleteById(code);
    }

    private AdministCodeDto convertToDto(AdministCode entity) {
        return AdministCodeDto.builder()
                .administZoneCode(entity.getAdministZoneCode())
                .administZoneSe(entity.getAdministZoneSe())
                .administZoneNm(entity.getAdministZoneNm())
                .upperAdministZoneCode(entity.getUpperAdministZoneCode())
                .useAt(entity.getUseAt())
                .creatDe(entity.getCreatDe())
                .ablDe(entity.getAblDe())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .lastModifiedBy(entity.getLastModifiedBy())
                .lastModifiedDate(entity.getLastModifiedDate())
                .build();
    }
}
