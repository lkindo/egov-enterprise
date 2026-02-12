package com.company.project.service.dam.impl;

import com.company.project.domain.dam.MapKno;
import com.company.project.domain.dam.MapKnoRepository;
import com.company.project.domain.dam.MapKnoSearchResult;
import com.company.project.service.dam.EgovMapKnoService;
import com.company.project.service.dam.dto.MapKnoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovMapKnoServiceImpl implements EgovMapKnoService {

    private final MapKnoRepository mapKnoRepository;

    @Override
    public Page<MapKnoSearchResult> selectMapKnoList(String searchCondition, String searchKeyword, Pageable pageable) {
        return mapKnoRepository.searchMapKno(searchCondition, searchKeyword, pageable);
    }

    @Override
    public MapKnoDto selectMapKnoDetail(String knoTypeCd) {
        MapKno entity = mapKnoRepository.findById(knoTypeCd)
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
    public void insertMapKno(MapKnoDto dto) {
        MapKno entity = MapKno.builder()
                .knoTypeCd(dto.getKnoTypeCd())
                .knoTypeNm(dto.getKnoTypeNm())
                .orgnztId(dto.getOrgnztId())
                .speId(dto.getSpeId())
                .clYmd(dto.getClYmd())
                .knoUrl(dto.getKnoUrl())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        mapKnoRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateMapKno(MapKnoDto dto) {
        MapKno entity = mapKnoRepository.findById(dto.getKnoTypeCd())
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge Type Code: " + dto.getKnoTypeCd()));
        entity.setKnoTypeNm(dto.getKnoTypeNm());
        entity.setOrgnztId(dto.getOrgnztId());
        entity.setSpeId(dto.getSpeId());
        entity.setClYmd(dto.getClYmd());
        entity.setKnoUrl(dto.getKnoUrl());
        entity.setLastUpdusrId(dto.getFrstRegisterId()); // Using register ID as updusr for simplicity
        entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
        mapKnoRepository.save(entity);
    }

    @Override
    @Transactional
    public void deleteMapKno(String knoTypeCd) {
        mapKnoRepository.deleteById(knoTypeCd);
    }
}
