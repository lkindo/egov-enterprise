package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.dam.KnowledgeRequest;
import com.company.project.domain.dam.KnowledgeRequestRepository;
import com.company.project.domain.dam.ProfessionalRepository;
import com.company.project.service.digitalassetmanagement.KnowledgeRequestService;
import com.company.project.service.digitalassetmanagement.dto.KnowledgeRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service("knowledgeRequestServiceImpl")
@RequiredArgsConstructor
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
    public KnowledgeRequestDto selectKnowledgeRequestDetail(String knoId) throws Exception {
        KnowledgeRequest entity = repository.findById(Objects.requireNonNull(knoId))
                .orElseThrow(() -> new Exception("Not found"));
        return convertToDto(entity);
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
        KnowledgeRequest entity = repository.findById(Objects.requireNonNull(requestDto.getKnoId()))
                .orElseThrow(() -> new Exception("Not found"));
        updateEntity(entity, requestDto);
        repository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeRequest(String knoId) throws Exception {
        repository.deleteById(Objects.requireNonNull(knoId));
    }

    @Override
    public boolean isSpecialist(String uniqId) throws Exception {
        return professionalRepository.existsBySpeId(uniqId);
    }

    @Override
    public int getReplyCount(String knoId) throws Exception {
        return (int) repository.countByAnsParents(Objects.requireNonNull(knoId));
    }

    private KnowledgeRequestDto convertToDto(KnowledgeRequest entity) {
        KnowledgeRequestDto dto = new KnowledgeRequestDto();
        dto.setKnoId(entity.getKnoId());
        dto.setKnoNm(entity.getKnoNm());
        dto.setKnoCn(entity.getKnoCn());
        dto.setKnoTypeCd(entity.getKnoTypeCd());
        dto.setOrgnztId(entity.getOrgnztId());
        dto.setSpeId(entity.getSpeId());
        dto.setEmplyrId(entity.getEmplyrId());
        dto.setAtchFileId(entity.getAtchFileId());
        dto.setAnsParents(entity.getAnsParents());
        dto.setAnsDepth(entity.getAnsDepth());
        dto.setAnsSeq(entity.getAnsSeq());
        dto.setAnsNumber(entity.getAnsNumber());
        dto.setFrstRegisterId(entity.getFrstRegisterId());
        dto.setFrstRegisterPnttm(entity.getFrstRegisterPnttm());
        dto.setLastUpdusrId(entity.getLastUpdusrId());
        dto.setLastUpdusrPnttm(entity.getLastUpdusrPnttm());
        return dto;
    }

    private KnowledgeRequest convertToEntity(KnowledgeRequestDto dto) {
        return KnowledgeRequest.builder()
                .knoId(dto.getKnoId())
                .knoNm(dto.getKnoNm())
                .knoCn(dto.getKnoCn())
                .knoTypeCd(dto.getKnoTypeCd())
                .orgnztId(dto.getOrgnztId())
                .speId(dto.getSpeId())
                .emplyrId(dto.getEmplyrId())
                .atchFileId(dto.getAtchFileId())
                .ansParents(dto.getAnsParents())
                .ansDepth(dto.getAnsDepth())
                .ansSeq(dto.getAnsSeq())
                .ansNumber(dto.getAnsNumber())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
    }

    private void updateEntity(KnowledgeRequest entity, KnowledgeRequestDto dto) {
        entity.setKnoNm(dto.getKnoNm());
        entity.setKnoCn(dto.getKnoCn());
        entity.setKnoTypeCd(dto.getKnoTypeCd());
        entity.setOrgnztId(dto.getOrgnztId());
        entity.setSpeId(dto.getSpeId());
        entity.setEmplyrId(dto.getEmplyrId());
        entity.setAtchFileId(dto.getAtchFileId());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
    }
}
