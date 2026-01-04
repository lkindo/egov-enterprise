package com.company.project.web.adapter;

import com.company.project.service.qna.dto.QnaDto;
import egovframework.com.uss.olh.qna.service.QnaVO;

/**
 * QnaDto <-> QnaVO 변환 어댑터
 */
public class QnaAdapter {

    public static QnaVO toVO(QnaDto dto) {
        if (dto == null)
            return null;

        QnaVO vo = new QnaVO();
        vo.setQaId(dto.getQaId());
        vo.setQestnSj(dto.getQestnSj());
        vo.setQestnCn(dto.getQestnCn());
        vo.setWritngPassword(dto.getWritngPassword());
        vo.setWrterNm(dto.getWrterNm());
        vo.setEmailAdres(dto.getEmailAdres());
        vo.setEmailAnswerAt(dto.getEmailAnswerAt());
        vo.setAreaNo(dto.getAreaNo());
        vo.setMiddleTelno(dto.getMiddleTelno());
        vo.setEndTelno(dto.getEndTelno());
        vo.setQnaProcessSttusCode(dto.getQnaProcessSttusCode());
        vo.setAnswerCn(dto.getAnswerCn());
        vo.setAnswerDe(dto.getAnswerDe());
        vo.setInqireCo(dto.getInqireCo() != null ? String.valueOf(dto.getInqireCo()) : "0");
        vo.setWritngDe(dto.getWritngDe());
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

    public static QnaDto toDto(QnaVO vo) {
        if (vo == null)
            return null;

        return QnaDto.builder()
                .qaId(vo.getQaId())
                .qestnSj(vo.getQestnSj())
                .qestnCn(vo.getQestnCn())
                .writngPassword(vo.getWritngPassword())
                .wrterNm(vo.getWrterNm())
                .emailAdres(vo.getEmailAdres())
                .emailAnswerAt(vo.getEmailAnswerAt())
                .areaNo(vo.getAreaNo())
                .middleTelno(vo.getMiddleTelno())
                .endTelno(vo.getEndTelno())
                .qnaProcessSttusCode(vo.getQnaProcessSttusCode())
                .answerCn(vo.getAnswerCn())
                .answerDe(vo.getAnswerDe())
                .writngDe(vo.getWritngDe())
                .build();
    }
}
