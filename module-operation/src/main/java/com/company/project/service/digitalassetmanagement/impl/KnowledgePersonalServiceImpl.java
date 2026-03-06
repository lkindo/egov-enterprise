package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.KnowledgeInf;
import com.company.project.domain.digitalassetmanagement.KnowledgeInfRepository;
import com.company.project.service.digitalassetmanagement.KnowledgePersonalService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 개인 지식정보 서비스 구현체
 */
@Service("knowledgePersonalServiceImpl")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgePersonalServiceImpl implements KnowledgePersonalService {

    private final KnowledgeInfRepository repository;

    @Override
    public Page<KnowledgeInf> selectKnowledgePersonalList(String searchCondition, String searchKeyword, String userId,
            Pageable pageable) throws Exception {
        return repository.findAll((root, query, cb) -> cb.equal(root.get("createdBy"), userId),
                Objects.requireNonNull(pageable));
    }

    @Override
    public KnowledgeDto selectKnowledgePersonalDetail(String knowledgeId) throws Exception {
        KnowledgeInf entity = repository.findById(Objects.requireNonNull(knowledgeId))
                .orElseThrow(() -> new Exception("Not found"));
        return KnowledgeDto.from(entity);
    }

    @Override
    @Transactional
    public void insertKnowledgePersonal(KnowledgeDto knowledgeDto) throws Exception {
        KnowledgeInf entity = convertToEntity(knowledgeDto);
        repository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgePersonal(KnowledgeDto knowledgeDto) throws Exception {
        KnowledgeInf entity = repository.findById(Objects.requireNonNull(knowledgeDto.getKnowledgeId()))
                .orElseThrow(() -> new Exception("Not found"));
        updateEntity(entity, knowledgeDto);
        repository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgePersonal(String knowledgeId) throws Exception {
        repository.deleteById(Objects.requireNonNull(knowledgeId));
    }

    private KnowledgeInf convertToEntity(KnowledgeDto dto) {
        KnowledgeInf entity = KnowledgeInf.builder()
                .knowledgeId(dto.getKnowledgeId())
                .title(dto.getTitle())
                .content(dto.getContent())
                .typeCode(dto.getTypeCode())
                .organizationId(dto.getOrganizationId())
                .expertId(dto.getExpertId())
                .isPublic(dto.getIsPublic())
                .evaluationDate(dto.getEvaluationDate())
                .evaluationGrade(dto.getEvaluationGrade())
                .disuseDate(dto.getDisuseDate())
                .attachedFileId(dto.getAttachedFileId())
                .build();
        entity.setCreatedBy(dto.getFirstRegisterId());
        return entity;
    }

    private void updateEntity(KnowledgeInf entity, KnowledgeDto dto) {
        entity.setTitle(dto.getTitle());
        entity.setContent(dto.getContent());
        entity.setTypeCode(dto.getTypeCode());
        entity.setOrganizationId(dto.getOrganizationId());
        entity.setExpertId(dto.getExpertId());
        entity.setIsPublic(dto.getIsPublic());
        entity.setAttachedFileId(dto.getAttachedFileId());
        entity.setLastModifiedBy(dto.getFirstRegisterId());
    }
}
