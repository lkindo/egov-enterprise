package com.company.project.service.dam.impl;

import com.company.project.domain.dam.KnowledgeRequest;
import com.company.project.domain.dam.KnowledgeRequestRepository;
import com.company.project.domain.dam.ProfessionalRepository;
import com.company.project.service.dam.EgovRequestOfferService;
import com.company.project.service.dam.dto.KnowledgeRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("egovRequestOfferServiceImpl")
@RequiredArgsConstructor
public class EgovRequestOfferServiceImpl implements EgovRequestOfferService {

    private final KnowledgeRequestRepository repository;
    private final ProfessionalRepository professionalRepository;

    @Override
    public Page<KnowledgeRequest> selectRequestOfferList(String searchCondition, String searchKeyword,
            Pageable pageable) throws Exception {
        return repository.searchKnowledgeRequest(searchCondition, searchKeyword, pageable);
    }

    @Override
    public KnowledgeRequestDto selectRequestOfferDetail(String knoId) throws Exception {
        KnowledgeRequest entity = repository.findById(knoId).orElseThrow(() -> new Exception("Not found"));
        return convertToDto(entity);
    }

    @Override
    @Transactional
    public void insertRequestOffer(KnowledgeRequestDto requestDto) throws Exception {
        KnowledgeRequest entity = convertToEntity(requestDto);
        repository.save(entity);
    }

    @Override
    @Transactional
    public void updateRequestOffer(KnowledgeRequestDto requestDto) throws Exception {
        KnowledgeRequest entity = repository.findById(requestDto.getKnoId())
                .orElseThrow(() -> new Exception("Not found"));
        updateEntity(entity, requestDto);
    }

    @Override
    @Transactional
    public void deleteRequestOffer(String knoId) throws Exception {
        repository.deleteById(knoId);
    }

    @Override
    public boolean isSpecialist(String uniqId) throws Exception {
        return professionalRepository.existsBySpeId(uniqId);
    }

    @Override
    public int getReplyCount(String knoId) throws Exception {
        // Correct implementation for counting replies via JpaRepository count or custom
        // query
        return (int) repository.countByAnsParents(knoId);
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
