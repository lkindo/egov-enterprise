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

import java.util.Objects;

/**
 * 지식 전문가 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeSpecialistServiceImpl implements KnowledgeSpecialistService {

        private final ProfessionalRepository professionalRepository;

        @Override
        public Page<ProfessionalSearchResult> selectKnowledgeSpecialistList(String searchCondition,
                        String searchKeyword,
                        Pageable pageable) {
                return professionalRepository.searchProfessionals(searchCondition, searchKeyword,
                                Objects.requireNonNull(pageable));
        }

        @Override
        public ProfessionalDto selectKnowledgeSpecialistDetail(String expertId, String typeCode,
                        String assessmentLevel) {
                Professional entity = professionalRepository
                                .findById(Objects.requireNonNull(
                                                new ProfessionalId(expertId, typeCode, assessmentLevel)))
                                .orElseThrow(() -> new IllegalArgumentException("Invalid Specialist ID combination"));
                return ProfessionalDto.from(entity);
        }

        @Override
        @Transactional
        public void insertKnowledgeSpecialist(ProfessionalDto dto) {
                Professional entity = Professional.builder()
                                .expertId(dto.getExpertId())
                                .typeCode(dto.getTypeCode())
                                .assessmentLevel(dto.getAssessmentLevel())
                                .expertDescription(dto.getExpertDescription())
                                .confirmedDate(dto.getConfirmedDate())
                                .build();
                entity.setCreatedBy(dto.getLastModifiedBy());
                professionalRepository.save(Objects.requireNonNull(entity));
        }

        @Override
        @Transactional
        public void updateKnowledgeSpecialist(ProfessionalDto dto) {
                Professional entity = professionalRepository
                                .findById(Objects
                                                .requireNonNull(new ProfessionalId(dto.getExpertId(), dto.getTypeCode(),
                                                                dto.getAssessmentLevel())))
                                .orElseThrow(() -> new IllegalArgumentException("Invalid Specialist ID combination"));
                entity.setExpertDescription(dto.getExpertDescription());
                entity.setConfirmedDate(dto.getConfirmedDate());
                entity.setLastModifiedBy(dto.getLastModifiedBy());
                professionalRepository.save(Objects.requireNonNull(entity));
        }

        @Override
        @Transactional
        public void deleteKnowledgeSpecialist(String expertId, String typeCode, String assessmentLevel) {
                professionalRepository
                                .deleteById(Objects.requireNonNull(
                                                new ProfessionalId(expertId, typeCode, assessmentLevel)));
        }
}
