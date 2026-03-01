package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.Professional;
import com.company.project.domain.digitalassetmanagement.ProfessionalId;
import com.company.project.domain.digitalassetmanagement.ProfessionalRepository;
import com.company.project.domain.digitalassetmanagement.ProfessionalSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeSpecialistService;
import com.company.project.service.digitalassetmanagement.dto.ProfessionalDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeSpecialistServiceImpl implements KnowledgeSpecialistService {

    private final ProfessionalRepository professionalRepository;

    @Override
    public Page<ProfessionalSearchResult> selectKnowledgeSpecialistList(String searchCondition, String searchKeyword,
            Pageable pageable) {
        return professionalRepository.searchProfessionals(searchCondition, searchKeyword,
                Objects.requireNonNull(pageable));
    }

    @Override
    public ProfessionalDto selectKnowledgeSpecialistDetail(String speId, String knoTypeCd, String appTypeCd) {
        Professional entity = professionalRepository
                .findById(Objects.requireNonNull(new ProfessionalId(speId, knoTypeCd, appTypeCd)))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Specialist ID combination"));
        return ProfessionalDto.builder()
                .speId(entity.getSpeId())
                .knoTypeCd(entity.getKnoTypeCd())
                .appTypeCd(entity.getAppTypeCd())
                .speExpCn(entity.getSpeExpCn())
                .speConfmDe(entity.getSpeConfmDe())
                .build();
    }

    @Override
    @Transactional
    public void insertKnowledgeSpecialist(ProfessionalDto dto) {
        Professional entity = Professional.builder()
                .speId(dto.getSpeId())
                .knoTypeCd(dto.getKnoTypeCd())
                .appTypeCd(dto.getAppTypeCd())
                .speExpCn(dto.getSpeExpCn())
                .speConfmDe(dto.getSpeConfmDe())
                .frstRegisterId(dto.getLastUpdusrId())
                .build();
        professionalRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgeSpecialist(ProfessionalDto dto) {
        Professional entity = professionalRepository
                .findById(Objects
                        .requireNonNull(new ProfessionalId(dto.getSpeId(), dto.getKnoTypeCd(),
                                dto.getAppTypeCd())))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Specialist ID combination"));
        entity.setSpeExpCn(dto.getSpeExpCn());
        entity.setSpeConfmDe(dto.getSpeConfmDe());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
        professionalRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeSpecialist(String speId, String knoTypeCd, String appTypeCd) {
        professionalRepository
                .deleteById(Objects.requireNonNull(new ProfessionalId(speId, knoTypeCd, appTypeCd)));
    }
}
