package com.company.project.service.digitalassetmanagement.impl;

import com.company.project.domain.digitalassetmanagement.MapTeam;
import com.company.project.domain.digitalassetmanagement.MapTeamRepository;
import com.company.project.service.digitalassetmanagement.KnowledgeMapTeamService;
import com.company.project.service.digitalassetmanagement.dto.MapTeamDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * 지식맵(조직분류) 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeMapTeamServiceImpl implements KnowledgeMapTeamService {

    private final MapTeamRepository mapTeamRepository;

    @Override
    public Page<MapTeamDto> selectKnowledgeMapTeamList(String searchCondition, String searchKeyword,
            Pageable pageable) {
        return mapTeamRepository.findAll(Objects.requireNonNull(pageable))
                .map(MapTeamDto::from);
    }

    @Override
    public MapTeamDto selectKnowledgeMapTeamDetail(String organizationId) {
        MapTeam entity = mapTeamRepository.findById(Objects.requireNonNull(organizationId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Organization ID: " + organizationId));
        return MapTeamDto.from(entity);
    }

    @Override
    @Transactional
    public void insertKnowledgeMapTeam(MapTeamDto dto) {
        MapTeam entity = MapTeam.builder()
                .organizationId(dto.getOrganizationId())
                .organizationName(dto.getOrganizationName())
                .classificationDate(dto.getClassificationDate())
                .knowledgeUrl(dto.getKnowledgeUrl())
                .build();
        entity.setCreatedBy(dto.getLastModifiedBy()); // Map lastModifiedBy to createdBy for insertion
        mapTeamRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgeMapTeam(MapTeamDto dto) {
        MapTeam entity = mapTeamRepository.findById(Objects.requireNonNull(dto.getOrganizationId()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Organization ID: " + dto.getOrganizationId()));
        entity.setOrganizationName(dto.getOrganizationName());
        entity.setClassificationDate(dto.getClassificationDate());
        entity.setKnowledgeUrl(dto.getKnowledgeUrl());
        entity.setLastModifiedBy(dto.getLastModifiedBy());
        mapTeamRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeMapTeam(String organizationId) {
        mapTeamRepository.deleteById(Objects.requireNonNull(organizationId));
    }
}