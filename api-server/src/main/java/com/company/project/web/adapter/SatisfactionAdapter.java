package com.company.project.web.adapter;

import com.company.project.service.board.dto.SatisfactionDto;
import egovframework.com.cop.bbs.service.Satisfaction;
import egovframework.com.cop.bbs.service.SatisfactionVO;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class SatisfactionAdapter {

    public static SatisfactionVO toVO(SatisfactionDto dto) {
        if (dto == null)
            return null;
        SatisfactionVO vo = new SatisfactionVO();
        vo.setStsfdgNo(dto.getSatisfactionId());
        vo.setNttId(dto.getArticleId() != null ? dto.getArticleId() : 0L);
        vo.setBbsId(dto.getBoardId());
        vo.setWrterId(dto.getWriterId());
        vo.setWrterNm(dto.getWriterNm());
        vo.setStsfdg(dto.getSatisfactionLevel() != null ? dto.getSatisfactionLevel() : 0);
        vo.setStsfdgCn(dto.getSatisfactionOpinion());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getWriterId()); // Assuming Writer is First Register

        if (dto.getCreatedDate() != null) {
            vo.setFrstRegisterPnttm(dto.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        }

        return vo;
    }

    public static SatisfactionDto toDto(SatisfactionVO vo) {
        if (vo == null)
            return null;
        return SatisfactionDto.builder()
                .satisfactionId(vo.getStsfdgNo())
                .articleId(vo.getNttId())
                .boardId(vo.getBbsId())
                .writerId(vo.getWrterId())
                .writerNm(vo.getWrterNm())
                .satisfactionLevel(vo.getStsfdg())
                .satisfactionOpinion(vo.getStsfdgCn())
                .useAt(vo.getUseAt())
                .build();
    }

    public static SatisfactionDto toDto(Satisfaction vo) {
        if (vo == null)
            return null;
        return SatisfactionDto.builder()
                .satisfactionId(vo.getStsfdgNo()) // Mapped from stsfdgNo
                .articleId(vo.getNttId())
                .boardId(vo.getBbsId())
                .writerId(vo.getWrterId())
                .writerNm(vo.getWrterNm())
                .satisfactionLevel(vo.getStsfdg()) // Mapped from stsfdg
                .satisfactionOpinion(vo.getStsfdgCn()) // Mapped from stsfdgCn
                .useAt(vo.getUseAt())
                .satisfactionPassword(vo.getStsfdgPassword()) // Added
                // .frstRegisterId(vo.getFrstRegisterId())
                // .lastUpdusrId(vo.getLastUpdusrId())
                .build();
    }

    public static Satisfaction toLegacy(SatisfactionDto dto) {
        if (dto == null)
            return null;
        Satisfaction vo = new Satisfaction();
        vo.setStsfdgNo(dto.getSatisfactionId());
        vo.setNttId(dto.getArticleId() != null ? dto.getArticleId() : 0L);
        vo.setBbsId(dto.getBoardId());
        vo.setWrterId(dto.getWriterId());
        vo.setWrterNm(dto.getWriterNm());
        vo.setStsfdg(dto.getSatisfactionLevel() != null ? dto.getSatisfactionLevel() : 0);
        vo.setStsfdgCn(dto.getSatisfactionOpinion());
        vo.setUseAt(dto.getUseAt());
        // Password not in DTO usually for security in list, but needed for update
        return vo;
    }

    public static List<SatisfactionVO> toVOList(List<SatisfactionDto> dtos) {
        if (dtos == null)
            return new ArrayList<>();
        return dtos.stream().map(SatisfactionAdapter::toVO).collect(Collectors.toList());
    }
}
