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

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovMapKnoServiceImpl implements EgovMapKnoService {

    private final MapKnoRepository mapKnoRepository;

    @Override
    public Page<MapKnoSearchResult> selectMapKnoList(String searchCondition, String searchKeyword, Pageable pageable) {
        return mapKnoRepository.searchMapKno(searchCondition, searchKeyword,
                Objects.requireNonNull(pageable));
    }

    @Override
    public MapKnoDto selectMapKnoDetail(String knoTypeCd) {
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
        mapKnoRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateMapKno(MapKnoDto dto) {
        MapKno entity = mapKnoRepository.findById(Objects.requireNonNull(dto.getKnoTypeCd()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid Knowledge Type Code: " + dto.getKnoTypeCd()));
        entity.setKnoTypeNm(dto.getKnoTypeNm());
        entity.setOrgnztId(dto.getOrgnztId());
        entity.setSpeId(dto.getSpeId());
        entity.setClYmd(dto.getClYmd());
        entity.setKnoUrl(dto.getKnoUrl());
        entity.setLastUpdusrId(dto.getFrstRegisterId()); // Using register ID as updusr for simplicity
        entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
        mapKnoRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteMapKno(String knoTypeCd) {
        mapKnoRepository.deleteById(Objects.requireNonNull(knoTypeCd));
    }
}
