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

import java.time.LocalDateTime;
import java.util.Objects;

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
    public MapKnoDto selectKnowledgeMapDetail(String knoTypeCd) {
        MapKno entity = mapKnoRepository.findById(Objects.requireNonNull(knoTypeCd))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge Type Code: " + knoTypeCd));
        return MapKnoDto.builder()
                .knoTypeCd(entity.getKnoTypeCd())
                .knoTypeNm(entity.getKnoTypeNm())
                .orgnztId(entity.getOrgnztId())
                .speId(entity.getSpeId())
                .clYmd(entity.getClYmd())
                .knoUrl(entity.getKnoUrl())
                .build();
    }

    @Override
    @Transactional
    public void insertKnowledgeMap(MapKnoDto dto) {
        MapKno entity = MapKno.builder()
                .knoTypeCd(dto.getKnoTypeCd())
                .knoTypeNm(dto.getKnoTypeNm())
                .orgnztId(dto.getOrgnztId())
                .speId(dto.getSpeId())
                .clYmd(dto.getClYmd())
                .knoUrl(dto.getKnoUrl())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        mapKnoRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateKnowledgeMap(MapKnoDto dto) {
        MapKno entity = mapKnoRepository.findById(Objects.requireNonNull(dto.getKnoTypeCd()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge Type Code: " + dto.getKnoTypeCd()));
        entity.setKnoTypeNm(dto.getKnoTypeNm());
        entity.setOrgnztId(dto.getOrgnztId());
        entity.setSpeId(dto.getSpeId());
        entity.setClYmd(dto.getClYmd());
        entity.setKnoUrl(dto.getKnoUrl());
        entity.setLastUpdusrId(dto.getFrstRegisterId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
        mapKnoRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteKnowledgeMap(String knoTypeCd) {
        mapKnoRepository.deleteById(Objects.requireNonNull(knoTypeCd));
    }
}
