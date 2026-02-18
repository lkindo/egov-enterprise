package com.company.project.service.dam.impl;

import com.company.project.domain.dam.Professional;
import com.company.project.domain.dam.ProfessionalId;
import com.company.project.domain.dam.ProfessionalRepository;
import com.company.project.domain.dam.ProfessionalSearchResult;
import com.company.project.service.dam.EgovKnoSpecialistService;
import com.company.project.service.dam.dto.ProfessionalDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovKnoSpecialistServiceImpl implements EgovKnoSpecialistService {

        private final ProfessionalRepository professionalRepository;

        @Override
        public Page<ProfessionalSearchResult> selectKnoSpecialistList(String searchCondition, String searchKeyword,
                        Pageable pageable) {
                return professionalRepository.searchProfessionals(searchCondition, searchKeyword,
                                Objects.requireNonNull(pageable));
        }

        @Override
        public ProfessionalDto selectKnoSpecialistDetail(String speId, String knoTypeCd, String appTypeCd) {
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
        public void insertKnoSpecialist(ProfessionalDto dto) {
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
        public void updateKnoSpecialist(ProfessionalDto dto) {
                Professional entity = professionalRepository
                                .findById(Objects
                                                .requireNonNull(new ProfessionalId(dto.getSpeId(), dto.getKnoTypeCd(),
                                                                dto.getAppTypeCd())))
                                .orElseThrow(() -> new IllegalArgumentException("Invalid Specialist ID combination"));
                entity.setSpeExpCn(dto.getSpeExpCn());
                entity.setSpeConfmDe(dto.getSpeConfmDe());
                entity.setLastUpdusrId(dto.getLastUpdusrId());
                entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
                professionalRepository.save(Objects.requireNonNull(entity));
        }

        @Override
        @Transactional
        public void deleteKnoSpecialist(String speId, String knoTypeCd, String appTypeCd) {
                professionalRepository
                                .deleteById(Objects.requireNonNull(new ProfessionalId(speId, knoTypeCd, appTypeCd)));
        }
}
