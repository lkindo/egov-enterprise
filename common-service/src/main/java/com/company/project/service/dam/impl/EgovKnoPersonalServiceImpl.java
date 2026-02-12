package com.company.project.service.dam.impl;

import com.company.project.domain.dam.KnowledgeInf;
import com.company.project.domain.dam.KnowledgeInfRepository;
import com.company.project.service.dam.EgovKnoPersonalService;
import com.company.project.service.dam.dto.KnowledgeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("egovKnoPersonalServiceImpl")
@RequiredArgsConstructor
public class EgovKnoPersonalServiceImpl implements EgovKnoPersonalService {

    private final KnowledgeInfRepository repository;

    @Override
    public Page<KnowledgeInf> selectKnoPersonalList(String searchCondition, String searchKeyword, String uniqId,
            Pageable pageable) throws Exception {
        // Simple search for personal knowledge
        return repository.findAll((root, query, cb) -> cb.equal(root.get("frstRegisterId"), uniqId), pageable);
    }

    @Override
    public KnowledgeDto selectKnoPersonalDetail(String knoId) throws Exception {
        KnowledgeInf entity = repository.findById(knoId).orElseThrow(() -> new Exception("Not found"));
        return convertToDto(entity);
    }

    @Override
    @Transactional
    public void insertKnoPersonal(KnowledgeDto knowledgeDto) throws Exception {
        KnowledgeInf entity = convertToEntity(knowledgeDto);
        repository.save(entity);
    }

    @Override
    @Transactional
    public void updateKnoPersonal(KnowledgeDto knowledgeDto) throws Exception {
        KnowledgeInf entity = repository.findById(knowledgeDto.getKnoId())
                .orElseThrow(() -> new Exception("Not found"));
        updateEntity(entity, knowledgeDto);
    }

    @Override
    @Transactional
    public void deleteKnoPersonal(String knoId) throws Exception {
        repository.deleteById(knoId);
    }

    private KnowledgeDto convertToDto(KnowledgeInf entity) {
        KnowledgeDto dto = new KnowledgeDto();
        dto.setKnoId(entity.getKnoId());
        dto.setKnoNm(entity.getKnoNm());
        dto.setKnoCn(entity.getKnoCn());
        dto.setKnoTypeCd(entity.getKnoTypeCd());
        dto.setOrgnztId(entity.getOrgnztId());
        dto.setSpeId(entity.getSpeId());
        dto.setOthbcAt(entity.getOthbcAt());
        dto.setAppYmd(entity.getAppYmd());
        dto.setKnoAps(entity.getKnoAps());
        dto.setJunkYmd(entity.getJunkYmd());
        dto.setAtchFileId(entity.getAtchFileId());
        dto.setFrstRegisterId(entity.getFrstRegisterId());
        return dto;
    }

    private KnowledgeInf convertToEntity(KnowledgeDto dto) {
        return KnowledgeInf.builder()
                .knoId(dto.getKnoId())
                .knoNm(dto.getKnoNm())
                .knoCn(dto.getKnoCn())
                .knoTypeCd(dto.getKnoTypeCd())
                .orgnztId(dto.getOrgnztId())
                .speId(dto.getSpeId())
                .othbcAt(dto.getOthbcAt())
                .appYmd(dto.getAppYmd())
                .knoAps(dto.getKnoAps())
                .junkYmd(dto.getJunkYmd())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
    }

    private void updateEntity(KnowledgeInf entity, KnowledgeDto dto) {
        entity.setKnoNm(dto.getKnoNm());
        entity.setKnoCn(dto.getKnoCn());
        entity.setKnoTypeCd(dto.getKnoTypeCd());
        entity.setOrgnztId(dto.getOrgnztId());
        entity.setSpeId(dto.getSpeId());
        entity.setOthbcAt(dto.getOthbcAt());
        entity.setAtchFileId(dto.getAtchFileId());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
    }
}
