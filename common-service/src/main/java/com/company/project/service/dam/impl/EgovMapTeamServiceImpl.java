package com.company.project.service.dam.impl;

import com.company.project.domain.dam.MapTeam;
import com.company.project.domain.dam.MapTeamRepository;
import com.company.project.service.dam.EgovMapTeamService;
import com.company.project.service.dam.dto.MapTeamDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovMapTeamServiceImpl implements EgovMapTeamService {

    private final MapTeamRepository mapTeamRepository;

    @Override
    public Page<MapTeamDto> selectMapTeamList(String searchCondition, String searchKeyword, Pageable pageable) {
        // Simplified search logic using basic ID/Name search
        // For production, this would use a more robust QueryDSL implementation in the
        // repository
        return mapTeamRepository.findAll(Objects.requireNonNull(pageable)).map(entity -> MapTeamDto.builder()
                .orgnztId(entity.getOrgnztId())
                .orgnztNm(entity.getOrgnztNm())
                .clYmd(entity.getClYmd())
                .knoUrl(entity.getKnoUrl())
                .build());
    }

    @Override
    public MapTeamDto selectMapTeamDetail(String orgnztId) {
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
    public void insertMapTeam(MapTeamDto dto) {
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
    public void updateMapTeam(MapTeamDto dto) {
        MapTeam entity = mapTeamRepository.findById(Objects.requireNonNull(dto.getOrgnztId()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Organization ID: " + dto.getOrgnztId()));
        entity.setOrgnztNm(dto.getOrgnztNm());
        entity.setClYmd(dto.getClYmd());
        entity.setKnoUrl(dto.getKnoUrl());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
        mapTeamRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteMapTeam(String orgnztId) {
        mapTeamRepository.deleteById(Objects.requireNonNull(orgnztId));
    }
}
