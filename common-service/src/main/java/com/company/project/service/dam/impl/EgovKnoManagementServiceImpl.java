package com.company.project.service.dam.impl;

import com.company.project.domain.dam.KnowledgeInf;
import com.company.project.domain.dam.KnowledgeInfRepository;
import com.company.project.domain.dam.KnowledgeInfSearchResult;
import com.company.project.service.dam.EgovKnoManagementService;
import com.company.project.service.dam.dto.KnowledgeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovKnoManagementServiceImpl implements EgovKnoManagementService {

        private final KnowledgeInfRepository knowledgeInfRepository;

        @Override
        public Page<KnowledgeInfSearchResult> selectKnoManagementList(String searchCondition, String searchKeyword,
                        Pageable pageable) {
                return knowledgeInfRepository.searchKnowledgeInf(searchCondition, searchKeyword,
                                Objects.requireNonNull(pageable));
        }

        @Override
        public KnowledgeDto selectKnoManagementDetail(String knoId, String emplyrId) {
                KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(knoId))
                                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge ID: " + knoId));

                // Note: The legacy SQL includes a join with MapKno, MapTeam, and User.
                // In a real implementation we would populate name fields here or change the
                // return type to a DTO projection.
                // For now, returning the basic DTO populated from the entity.
                return KnowledgeDto.builder()
                                .knoId(entity.getKnoId())
                                .knoNm(entity.getKnoNm())
                                .knoCn(entity.getKnoCn())
                                .knoTypeCd(entity.getKnoTypeCd())
                                .orgnztId(entity.getOrgnztId())
                                .speId(entity.getSpeId())
                                .othbcAt(entity.getOthbcAt())
                                .appYmd(entity.getAppYmd())
                                .knoAps(entity.getKnoAps())
                                .junkYmd(entity.getJunkYmd())
                                .atchFileId(entity.getAtchFileId())
                                .frstRegisterId(entity.getFrstRegisterId())
                                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                                .build();
        }

        @Override
        @Transactional
        public void updateKnoManagement(KnowledgeDto dto) {
                KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(dto.getKnoId()))
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Invalid Knowledge ID: " + dto.getKnoId()));

                entity.setJunkYmd(dto.getJunkYmd());
                entity.setKnoAps(dto.getKnoAps());
                entity.setLastUpdusrId(dto.getLastUpdusrId());
                entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());

                knowledgeInfRepository.save(Objects.requireNonNull(entity));
        }
}
