package com.company.project.web.adapter;

import com.company.project.service.scrap.dto.ScrapDto;
import egovframework.com.cop.scp.service.Scrap;
import egovframework.com.cop.scp.service.ScrapVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ScrapAdapter {

    public static ScrapVO toVO(ScrapDto dto) {
        if (dto == null)
            return null;
        ScrapVO vo = new ScrapVO();
        vo.setScrapId(dto.getScrapId());
        vo.setBbsId(dto.getBbsId());
        vo.setNttId(dto.getNttId() != null ? dto.getNttId() : 0L);
        vo.setScrapNm(dto.getScrapNm());
        vo.setUseAt(dto.getUseAt());
        vo.setUniqId(dto.getUniqId());
        vo.setFrstRegisterId(dto.getFrstRegisterId());

        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        }

        return vo;
    }

    public static ScrapDto toDto(ScrapVO vo) {
        if (vo == null)
            return null;
        return ScrapDto.builder()
                .scrapId(vo.getScrapId())
                .bbsId(vo.getBbsId())
                .nttId(vo.getNttId())
                .scrapNm(vo.getScrapNm())
                .useAt(vo.getUseAt())
                .uniqId(vo.getUniqId())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    public static ScrapDto toDto(Scrap vo) {
        if (vo == null)
            return null;
        return ScrapDto.builder()
                .scrapId(vo.getScrapId())
                .bbsId(vo.getBbsId())
                .nttId(vo.getNttId())
                .scrapNm(vo.getScrapNm())
                .useAt(vo.getUseAt())
                .uniqId(vo.getUniqId())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    public static List<ScrapVO> toVOList(List<ScrapDto> dtos) {
        if (dtos == null)
            return new ArrayList<>();
        return dtos.stream().map(ScrapAdapter::toVO).collect(Collectors.toList());
    }
}
