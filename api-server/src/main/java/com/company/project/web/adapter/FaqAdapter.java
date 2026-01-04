package com.company.project.web.adapter;

import com.company.project.service.faq.dto.FaqDto;
import egovframework.com.uss.olh.faq.service.FaqVO;

/**
 * FaqDto <-> FaqVO 변환 어댑터
 */
public class FaqAdapter {

    /**
     * DTO를 레거시 VO로 변환
     */
    public static FaqVO toVO(FaqDto dto) {
        if (dto == null)
            return null;

        FaqVO vo = new FaqVO();
        vo.setFaqId(dto.getFaqId());
        vo.setQestnSj(dto.getQestnSj());
        vo.setQestnCn(dto.getQestnCn());
        vo.setAnswerCn(dto.getAnswerCn());
        vo.setInqireCo(dto.getInqireCo() != null ? String.valueOf(dto.getInqireCo()) : "0");
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString().replace("T", " "));
        }
        vo.setLastUpdusrId(dto.getLastUpdusrId());
        if (dto.getLastUpdusrPnttm() != null) {
            vo.setLastUpdusrPnttm(dto.getLastUpdusrPnttm().toString().replace("T", " "));
        }
        return vo;
    }

    /**
     * 레거시 VO를 DTO로 변환
     */
    public static FaqDto toDto(FaqVO vo) {
        if (vo == null)
            return null;

        return FaqDto.builder()
                .faqId(vo.getFaqId())
                .qestnSj(vo.getQestnSj())
                .qestnCn(vo.getQestnCn())
                .answerCn(vo.getAnswerCn())
                .atchFileId(vo.getAtchFileId())
                .frstRegisterId(vo.getFrstRegisterId())
                .lastUpdusrId(vo.getLastUpdusrId())
                .build();
    }
}
