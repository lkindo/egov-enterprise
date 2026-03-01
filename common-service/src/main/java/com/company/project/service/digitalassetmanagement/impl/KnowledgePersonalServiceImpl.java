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

@Service("knowledgePersonalServiceImpl")
@RequiredArgsConstructor
public class KnowledgePersonalServiceImpl implements KnowledgePersonalService {

    private final KnowledgeInfRepository repository;

    @Override
    public Page<KnowledgeInf> selectKnowledgePersonalList(String searchCondition, String searchKeyword, String uniqId,
            Pageable pageable) throws Exception {
        return repository.findAll((root, query, cb) -> cb.equal(root.get("frstRegisterId"), uniqId),
                Objects.requireNonNull(pageable));
    }

    @Override
    public KnowledgeDto selectKnowledgePersonalDetail(String knoId) throws Exception {
        KnowledgeInf entity = repository.findById(Objects.requireNonNull(knoId))
                .orElseThrow(() -> new Exception("Not found"));
        return convertToDto(entity);
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
        KnowledgeInf entity = repository.findById(Objects.requireNonNull(knowledgeDto.getKnoId()))
                .orElseThrow(() -> new Exception("Not found"));
        updateEntity(entity, knowledgeDto);
        repository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgePersonal(String knoId) throws Exception {
        repository.deleteById(Objects.requireNonNull(knoId));
    }

    private KnowledgeDto convertToDto(KnowledgeInf entity) {
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
                .build();
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
