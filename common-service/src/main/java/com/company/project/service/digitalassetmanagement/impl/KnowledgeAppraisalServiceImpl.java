package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfRepository;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeAppraisalService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 지식평가 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeAppraisalServiceImpl implements KnowledgeAppraisalService {

        private final KnowledgeInfRepository knowledgeInfRepository;

        @Override
        public Page<KnowledgeInfSearchResult> selectKnowledgeAppraisalList(String userId, String searchCondition,
                        String searchKeyword, Pageable pageable) {
                return knowledgeInfRepository.searchKnowledgeInf(searchCondition, searchKeyword,
                                Objects.requireNonNull(pageable));
        }

        @Override
        public KnowledgeDto selectKnowledgeAppraisalDetail(String knowledgeId) {
                KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(knowledgeId))
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Invalid Knowledge ID: " + knowledgeId));

                return KnowledgeDto.from(entity);
        }

        @Override
        @Transactional
        public void updateKnowledgeAppraisal(KnowledgeDto dto) {
                KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(dto.getKnowledgeId()))
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Invalid Knowledge ID: " + dto.getKnowledgeId()));

                entity.setEvaluationDate(dto.getEvaluationDate());
                entity.setEvaluationGrade(dto.getEvaluationGrade());
                entity.setExpertId(dto.getExpertId());
                entity.setLastModifiedBy(dto.getFirstRegisterId());

                knowledgeInfRepository.save(Objects.requireNonNull(entity));
        }
}