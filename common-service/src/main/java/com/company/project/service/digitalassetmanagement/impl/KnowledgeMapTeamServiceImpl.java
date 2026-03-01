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

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeMapTeamServiceImpl implements KnowledgeMapTeamService {

    private final MapTeamRepository mapTeamRepository;

    @Override
    public Page<MapTeamDto> selectKnowledgeMapTeamList(String searchCondition, String searchKeyword,
            Pageable pageable) {
        return mapTeamRepository.findAll(Objects.requireNonNull(pageable)).map(entity -> MapTeamDto.builder()
                .orgnztId(entity.getOrgnztId())
                .orgnztNm(entity.getOrgnztNm())
                .clYmd(entity.getClYmd())
                .knoUrl(entity.getKnoUrl())
                .build());
    }

    @Override
    public MapTeamDto selectKnowledgeMapTeamDetail(String orgnztId) {
        MapTeam entity = mapTeamRepository.findById(Objects.requireNonNull(orgnztId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Organization ID: " + orgnztId));
        return MapTeamDto.builder()
                .orgnztId(entity.getOrgnztId())
                .orgnztNm(entity.getOrgnztNm())
                .clYmd(entity.getClYmd())
                .knoUrl(entity.getKnoUrl())
                .build();
    }

    @Override
    @Transactional
    public void insertKnowledgeMapTeam(MapTeamDto dto) {
        MapTeam entity = MapTeam.builder()
                .orgnztId(dto.getOrgnztId())
                .orgnztNm(dto.getOrgnztNm())
                .clYmd(dto.getClYmd())
                .knoUrl(dto.getKnoUrl())
                .lastUpdusrId(dto.getLastUpdusrId())
                .build();
        mapTeamRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgeMapTeam(MapTeamDto dto) {
        MapTeam entity = mapTeamRepository.findById(Objects.requireNonNull(dto.getOrgnztId()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Organization ID: " + dto.getOrgnztId()));
        entity.setOrgnztNm(dto.getOrgnztNm());
        entity.setClYmd(dto.getClYmd());
        entity.setKnoUrl(dto.getKnoUrl());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
        mapTeamRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeMapTeam(String orgnztId) {
        mapTeamRepository.deleteById(Objects.requireNonNull(orgnztId));
    }
}
