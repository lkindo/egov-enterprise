package com.company.project.web.adapter;

import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardMasterDto;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import java.util.List;
import java.util.stream.Collectors;

/**
 * BoardDto <-> BoardVO ???????
 **/
public class BoardAdapter {

    public static BoardVO toVO(BoardDto dto) {
        if (dto == null)
            return null;
        BoardVO vo = new BoardVO();
        vo.setNttId(dto.getId());
        vo.setBbsId(dto.getBbsId());
        vo.setNttNo(dto.getNttNo());
        vo.setNttSj(dto.getNttSj());
        vo.setNttCn(dto.getNttCn());
        vo.setNtcrId(dto.getNtcrId());
        vo.setNtcrNm(dto.getNtcrNm());
        vo.setInqireCo(dto.getInqireCo() != null ? dto.getInqireCo() : 0);

        // Date conversion
        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString());
        }

        vo.setFrstRegisterId(dto.getFrstRegisterId());

        if (dto.getLastUpdtPnttm() != null) {
            vo.setLastUpdusrPnttm(dto.getLastUpdtPnttm().toString());
        }

        vo.setLastUpdusrId(dto.getLastUpdusrId());
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setParnts(dto.getParnts());
        vo.setReplyLc(dto.getReplyLc() != null ? dto.getReplyLc().toString() : "0");
        vo.setSortOrdr(dto.getSortOrdr());

        vo.setNtceBgnde(dto.getNtceBgnde());
        vo.setNtceEndde(dto.getNtceEndde());
        vo.setUseAt(dto.getUseAt());
        vo.setPassword(dto.getPassword());
        vo.setSecretAt(dto.getSecretAt());

        // Blog Logic?
        // vo.setBlogAt(dto.getBlogAt());

        return vo;
    }

    public static List<BoardVO> toVOList(List<BoardDto> dtoList) {
        if (dtoList == null)
            return List.of();
        return dtoList.stream()
                .map(BoardAdapter::toVO)
                .collect(Collectors.toList());
    }

    public static BoardMasterVO toMasterVO(BoardMasterDto dto) {
        if (dto == null)
            return null;
        BoardMasterVO vo = new BoardMasterVO();
        vo.setBbsId(dto.getBbsId());
        vo.setBbsNm(dto.getBbsNm());
        vo.setBbsIntrcn(dto.getBbsIntrcn());
        vo.setBbsTyCode(dto.getBbsTyCode());
        // vo.setBbsAttrbCode(dto.getBbsAttrbCode()); // Field missing in legacy VO
        vo.setReplyPosblAt(dto.getReplyPosblAt());
        vo.setFileAtchPosblAt(dto.getFileAtchPosblAt());
        vo.setAtchPosblFileNumber(dto.getAtchPosblFileNumber() != null ? dto.getAtchPosblFileNumber() : 0);
        vo.setAtchPosblFileSize(dto.getAtchPosblFileSize() != null ? String.valueOf(dto.getAtchPosblFileSize()) : "0");
        vo.setTmplatId(dto.getTmplatId());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm() != null ? dto.getFrstRegisterPnttm().toString() : ""); // Ideally
                                                                                                                  // format
        vo.setLastUpdusrId(dto.getLastUpdusrId());
        vo.setLastUpdusrPnttm(dto.getLastUpdusrPnttm() != null ? dto.getLastUpdusrPnttm().toString() : "");
        vo.setUseAt(dto.getUseAt());
        vo.setCmmntyId(dto.getCmmntyId());
        vo.setBlogId(dto.getBlogId());
        vo.setBlogAt(dto.getBlogAt());
        vo.setCommentAt(dto.getCommentAt());
        vo.setStsfdgAt(dto.getStsfdgAt());

        // Handling optional fields that might be missing in DTO
        vo.setAuthFlag(dto.getAuthFlag());
        vo.setTmplatCours(dto.getTmplatCours());

        return vo;
    }

    public static BoardMasterDto toMasterDto(egovframework.com.cop.bbs.service.BoardMaster vo) {
        if (vo == null)
            return null;
        Long fileSize = 0L;
        try {
            fileSize = Long.parseLong(vo.getAtchPosblFileSize());
        } catch (NumberFormatException e) {
            fileSize = 0L; // Default
        }

        // Default bbsAttrbCode since legacy BoardMaster doesn't have it
        String attrbCode = "BBSA01"; // Default to General Board Attribute

        return BoardMasterDto.builder()
                .bbsId(vo.getBbsId())
                .bbsNm(vo.getBbsNm())
                .bbsIntrcn(vo.getBbsIntrcn())
                .bbsTyCode(vo.getBbsTyCode())
                .bbsAttrbCode(attrbCode)
                .replyPosblAt(vo.getReplyPosblAt())
                .fileAtchPosblAt(vo.getFileAtchPosblAt())
                .atchPosblFileNumber(vo.getAtchPosblFileNumber())
                .atchPosblFileSize(fileSize)
                .tmplatId(vo.getTmplatId())
                .frstRegisterId(vo.getFrstRegisterId())
                .lastUpdusrId(vo.getLastUpdusrId())
                .useAt(vo.getUseAt())
                .cmmntyId(vo.getCmmntyId())
                .blogId(vo.getBlogId())
                .blogAt(vo.getBlogAt())
                .commentAt(vo.getCommentAt())
                .stsfdgAt(vo.getStsfdgAt())
                .build();
    }
}
