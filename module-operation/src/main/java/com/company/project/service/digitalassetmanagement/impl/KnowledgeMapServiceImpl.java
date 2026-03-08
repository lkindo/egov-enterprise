package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.MapKno;
import com.company.project.domain.digitalassetmanagement.MapKnoRepository;
import com.company.project.domain.digitalassetmanagement.MapKnoSearchResult;
import com.company.project.service.digitalassetmanagement.KnowledgeMapService;
import com.company.project.service.digitalassetmanagement.dto.MapKnoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 지식맵 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeMapServiceImpl implements KnowledgeMapService {

    private final MapKnoRepository mapKnoRepository;

    @Override
    public Page<MapKnoSearchResult> selectKnowledgeMapList(String searchCondition, String searchKeyword,
            Pageable pageable) {
        return mapKnoRepository.searchMapKno(searchCondition, searchKeyword,
                Objects.requireNonNull(pageable));
    }

    @Override
    public MapKnoDto selectKnowledgeMapDetail(String typeCode) {
        MapKno entity = mapKnoRepository.findById(Objects.requireNonNull(typeCode))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge Type Code: " + typeCode));
        return MapKnoDto.from(entity);
    }

    @Override
    @Transactional
    public void insertKnowledgeMap(MapKnoDto dto) {
        MapKno entity = MapKno.builder()
                .typeCode(dto.getTypeCode())
                .typeName(dto.getTypeName())
                .organizationId(dto.getOrganizationId())
                .expertId(dto.getExpertId())
                .classificationDate(dto.getClassificationDate())
                .knowledgeUrl(dto.getKnowledgeUrl())
                .build();
        entity.setCreatedBy(dto.getFirstRegisterId());
        mapKnoRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgeMap(MapKnoDto dto) {
        MapKno entity = mapKnoRepository.findById(Objects.requireNonNull(dto.getTypeCode()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge Type Code: " + dto.getTypeCode()));
        entity.setTypeName(dto.getTypeName());
        entity.setOrganizationId(dto.getOrganizationId());
        entity.setExpertId(dto.getExpertId());
        entity.setClassificationDate(dto.getClassificationDate());
        entity.setKnowledgeUrl(dto.getKnowledgeUrl());
        entity.setLastModifiedBy(dto.getFirstRegisterId());
        mapKnoRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeMap(String typeCode) {
        mapKnoRepository.deleteById(Objects.requireNonNull(typeCode));
    }
}
