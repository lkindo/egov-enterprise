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
import java.util.Objects;

/**
 * 지식정보 관리 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeManagementServiceImpl implements KnowledgeManagementService {

        private final KnowledgeInfRepository knowledgeInfRepository;

        @Override
        public Page<KnowledgeInfSearchResult> selectKnowledgeManagementList(String searchCondition,
                        String searchKeyword,
                        Pageable pageable) {
                return knowledgeInfRepository.searchKnowledgeInf(searchCondition, searchKeyword,
                                Objects.requireNonNull(pageable));
        }

        @Override
        public KnowledgeDto selectKnowledgeManagementDetail(String knowledgeId, String userId) {
                KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(knowledgeId))
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Invalid Knowledge ID: " + knowledgeId));

                return KnowledgeDto.from(entity);
        }

        @Override
        @Transactional
        public void updateKnowledgeManagement(KnowledgeDto dto) {
                KnowledgeInf entity = knowledgeInfRepository.findById(Objects.requireNonNull(dto.getKnowledgeId()))
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Invalid Knowledge ID: " + dto.getKnowledgeId()));

                entity.setDisuseDate(dto.getDisuseDate());
                entity.setEvaluationGrade(dto.getEvaluationGrade());
                // auditing fields are handled by JPA auditing if enabled, but we can set them
                // manually if needed via BaseEntity methods
                entity.setLastModifiedBy(dto.getFirstRegisterId()); // Using appropriate field for modifier

                knowledgeInfRepository.save(Objects.requireNonNull(entity));
        }
}
