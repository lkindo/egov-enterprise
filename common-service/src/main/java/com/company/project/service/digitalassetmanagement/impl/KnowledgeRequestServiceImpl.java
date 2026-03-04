package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.KnowledgeRequest;
import com.company.project.domain.digitalassetmanagement.KnowledgeRequestRepository;
import com.company.project.domain.digitalassetmanagement.ProfessionalRepository;
import com.company.project.service.digitalassetmanagement.KnowledgeRequestService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 지식요청/답변 서비스 구현체
 */
@Service("knowledgeRequestServiceImpl")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeRequestServiceImpl implements KnowledgeRequestService {

    private final KnowledgeRequestRepository repository;
    private final ProfessionalRepository professionalRepository;

    @Override
    public Page<KnowledgeRequest> selectKnowledgeRequestList(String searchCondition, String searchKeyword,
            Pageable pageable) throws Exception {
        return repository.searchKnowledgeRequest(searchCondition, searchKeyword,
                Objects.requireNonNull(pageable));
    }

    @Override
    public KnowledgeRequestDto selectKnowledgeRequestDetail(String knowledgeId) throws Exception {
        KnowledgeRequest entity = repository.findById(Objects.requireNonNull(knowledgeId))
                .orElseThrow(() -> new Exception("Not found"));
        return KnowledgeRequestDto.from(entity);
    }

    @Override
    @Transactional
    public void insertKnowledgeRequest(KnowledgeRequestDto requestDto) throws Exception {
        KnowledgeRequest entity = convertToEntity(requestDto);
        repository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgeRequest(KnowledgeRequestDto requestDto) throws Exception {
        KnowledgeRequest entity = repository.findById(Objects.requireNonNull(requestDto.getKnowledgeId()))
                .orElseThrow(() -> new Exception("Not found"));
        updateEntity(entity, requestDto);
        repository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeRequest(String knowledgeId) throws Exception {
        repository.deleteById(Objects.requireNonNull(knowledgeId));
    }

    @Override
    public boolean isSpecialist(String userId) throws Exception {
        return professionalRepository.existsByExpertId(userId);
    }

    @Override
    public int getReplyCount(String knowledgeId) throws Exception {
        return (int) repository.countByParentKnowledgeId(Objects.requireNonNull(knowledgeId));
    }

    private KnowledgeRequest convertToEntity(KnowledgeRequestDto dto) {
        return KnowledgeRequest.builder()
                .knowledgeId(dto.getKnowledgeId())
                .title(dto.getTitle())
                .content(dto.getContent())
                .typeCode(dto.getTypeCode())
                .organizationId(dto.getOrganizationId())
                .expertId(dto.getExpertId())
                .emplyrId(dto.getUserId())
                .attachedFileId(dto.getAttachedFileId())
                .parentKnowledgeId(dto.getParentKnowledgeId())
                .answerDepth(dto.getAnswerDepth())
                .answerOrder(dto.getAnswerOrder())
                .answerGroupNumber(dto.getAnswerGroupNumber())
                .build();
    }

    private void updateEntity(KnowledgeRequest entity, KnowledgeRequestDto dto) {
        entity.setTitle(dto.getTitle());
        entity.setContent(dto.getContent());
        entity.setTypeCode(dto.getTypeCode());
        entity.setOrganizationId(dto.getOrganizationId());
        entity.setExpertId(dto.getExpertId());
        entity.setEmplyrId(dto.getUserId());
        entity.setAttachedFileId(dto.getAttachedFileId());
        entity.setLastModifiedBy(dto.getFirstRegisterId());
    }
}