package com.company.project.service.dam.impl;

import com.company.project.domain.dam.KnowledgeInf;
import com.company.project.domain.dam.KnowledgeInfRepository;
import com.company.project.domain.dam.KnowledgeInfSearchResult;
import com.company.project.service.dam.EgovKnoAppraisalService;
import com.company.project.service.dam.dto.KnowledgeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovKnoAppraisalServiceImpl implements EgovKnoAppraisalService {

    private final KnowledgeInfRepository knowledgeInfRepository;

    @Override
    public Page<KnowledgeInfSearchResult> selectKnoAppraisalList(String emplyrId, String searchCondition,
            String searchKeyword, Pageable pageable) {
        // In the legacy SQL, appraisal list filtering is slightly different (e.g.
        // status != '3')
        // For now using the same search logic, but logically we should separate it if
        // needed.
        return knowledgeInfRepository.searchKnowledgeInf(searchCondition, searchKeyword, pageable);
    }

    @Override
    public KnowledgeDto selectKnoAppraisalDetail(String knoId) {
        KnowledgeInf entity = knowledgeInfRepository.findById(knoId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge ID: " + knoId));

        return KnowledgeDto.builder()
                .knoId(entity.getKnoId())
                .knoNm(entity.getKnoNm())
                .knoCn(entity.getKnoCn())
                .knoTypeCd(entity.getKnoTypeCd())
                .othbcAt(entity.getOthbcAt())
                .appYmd(entity.getAppYmd())
                .knoAps(entity.getKnoAps())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }

    @Override
    @Transactional
    public void updateKnoAppraisal(KnowledgeDto dto) {
        KnowledgeInf entity = knowledgeInfRepository.findById(dto.getKnoId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge ID: " + dto.getKnoId()));

        entity.setAppYmd(dto.getAppYmd());
        entity.setKnoAps(dto.getKnoAps());
        entity.setSpeId(dto.getSpeId());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());

        knowledgeInfRepository.save(entity);
    }
}
