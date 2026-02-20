package com.company.project.web.adapter;

import com.company.project.service.stats.dto.StatsDto;
import egovframework.com.sts.com.StatsVO;

/**
 * StatsDto <-> StatsVO ???????
 **/
public class StatsAdapter {

    public static StatsVO toVO(StatsDto dto) {
        if (dto == null)
            return null;

        StatsVO vo = new StatsVO();
        vo.setStatsDate(dto.getStatsDate());
        vo.setStatsCo(dto.getStatsCo());
        vo.setMaxStatsCo(dto.getMaxStatsCo());
        vo.setMinStatsCo(dto.getMinStatsCo());
        vo.setCreatCo(dto.getCreatCo());
        vo.setInqireCo(dto.getInqireCo());
        vo.setUpdtCo(dto.getUpdtCo());
        vo.setDeleteCo(dto.getDeleteCo());
        vo.setOutptCo(dto.getOutptCo());
        vo.setErrorCo(dto.getErrorCo());
        vo.setTotInqireCo(dto.getTotInqireCo());
        vo.setAvrgInqireCo(dto.getAvrgInqireCo());
        vo.setMaxUnit(dto.getMaxUnit());
        return vo;
    }

    public static StatsDto toDto(StatsVO vo) {
        if (vo == null)
            return null;

        return StatsDto.builder()
                .fromDate(vo.getFromDate())
                .toDate(vo.getToDate())
                .statsKind(vo.getStatsKind())
                .detailStatsKind(vo.getDetailStatsKind())
                .pdKind(vo.getPdKind())
                .build();
    }
}
