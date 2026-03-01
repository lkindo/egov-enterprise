package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfRepository;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeManagementService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
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
public class KnowledgeManagementServiceImpl implements KnowledgeManagementService {

    private final KnowledgeInfRepository knowledgeInfRepository;

    @Override
    public Page<KnowledgeInfSearchResult> selectKnowledgeManagementList(String searchCondition, String searchKeyword,
            Pageable pageable) {
        return knowledgeInfRepository.searchKnowledgeInf(searchCondition, searchKeyword,
                Objects.requireNonNull(pageable));
    }

    @Override
    public KnowledgeDto selectKnowledgeManagementDetail(String knoId, String emplyrId) {
        KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(knoId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge ID: " + knoId));

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
    public void updateKnowledgeManagement(KnowledgeDto dto) {
        KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(dto.getKnoId()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid Knowledge ID: " + dto.getKnoId()));

        entity.setJunkYmd(dto.getJunkYmd());
        entity.setKnoAps(dto.getKnoAps());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());

        knowledgeInfRepository.save(Objects.requireNonNull(entity));
    }
}
