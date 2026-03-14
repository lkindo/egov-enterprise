package com.company.project.service.code;

import com.company.project.domain.code.InstitutionCode;
import com.company.project.domain.code.InstitutionCodeRecptnLog;
import com.company.project.domain.code.InstitutionCodeRecptnLogRepository;
import com.company.project.repository.code.InstitutionCodeRepository;
import com.company.project.service.code.dto.InstitutionCodeDto;
import com.company.project.service.code.dto.InstitutionCodeRecptnDto;
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
    private final InstitutionCodeRecptnLogRepository recptnLogRepository;

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

    public Page<InstitutionCodeRecptnDto> getInstitutionCodeRecptnList(String searchWrd, String processSe, Pageable pageable) {
        Page<InstitutionCodeRecptnLog> entities;
        if (processSe != null && !processSe.isEmpty()) {
            entities = recptnLogRepository.findByAllInsttNmContainingAndProcessSe(searchWrd, processSe, pageable);
        } else {
            entities = recptnLogRepository.findByAllInsttNmContaining(searchWrd, pageable);
        }
        return entities.map(this::convertToRecptnDto);
    }

    @Transactional
    public void processInstitutionCodeRecptn(String occrrncDe, String insttCode, Long opertSn, String userId) {
        InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId id = InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId.builder()
                .occrrncDe(occrrncDe)
                .insttCode(insttCode)
                .opertSn(opertSn)
                .build();
        
        InstitutionCodeRecptnLog logEntity = recptnLogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Institution code reception log not found"));
        
        // 1. Mark log as processed
        logEntity.updateProcessSe("1", userId);
        
        // 2. Sync to main InstitutionCode table
        InstitutionCode instt = institutionCodeRepository.findById(insttCode)
                .orElseGet(() -> InstitutionCode.builder().insttCode(insttCode).build());
        
        instt.update(
                logEntity.getAllInsttNm(),
                logEntity.getLowestInsttNm(),
                logEntity.getInsttAbrvNm(),
                logEntity.getOdr(),
                logEntity.getOrd(),
                logEntity.getInsttOdr(),
                logEntity.getBestInsttCode(),
                logEntity.getUpperInsttCode(),
                logEntity.getReprsntInsttCode(),
                logEntity.getInsttTyLclas(),
                logEntity.getInsttTyMclas(),
                logEntity.getInsttTySclas(),
                logEntity.getTelno(),
                logEntity.getFxnum(),
                logEntity.getCreatDe(),
                logEntity.getAblDe(),
                logEntity.getAblEnnc(),
                logEntity.getChangede(),
                logEntity.getChangeTime(),
                logEntity.getBsisDe(),
                logEntity.getSortOrdr(),
                userId
        );
        
        institutionCodeRepository.save(instt);
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

    private InstitutionCodeRecptnDto convertToRecptnDto(InstitutionCodeRecptnLog entity) {
        return InstitutionCodeRecptnDto.builder()
                .occrrncDe(entity.getId().getOccrrncDe())
                .insttCode(entity.getId().getInsttCode())
                .opertSn(entity.getId().getOpertSn())
                .changeSeCode(entity.getChangeSeCode())
                .processSe(entity.getProcessSe())
                .etcCode(entity.getEtcCode())
                .allInsttNm(entity.getAllInsttNm())
                .lowestInsttNm(entity.getLowestInsttNm())
                .telno(entity.getTelno())
                .fxnum(entity.getFxnum())
                .creatDe(entity.getCreatDe())
                .ablDe(entity.getAblDe())
                .ablEnnc(entity.getAblEnnc())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}
