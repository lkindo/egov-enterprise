package com.company.project.web.adapter;

import java.util.List;
import java.util.stream.Collectors;

import com.company.project.service.comment.dto.CommentDto;
import egovframework.com.cop.cmt.service.Comment;
import egovframework.com.cop.cmt.service.CommentVO;

public class CommentAdapter {

    public static CommentVO toVO(CommentDto dto) {
        if (dto == null)
            return null;

        CommentVO vo = new CommentVO();
        vo.setCommentNo(dto.getCommentNo() != null ? String.valueOf(dto.getCommentNo()) : "");
        vo.setNttId(dto.getNttId());
        vo.setBbsId(dto.getBbsId());
        vo.setWrterId(dto.getWrterId());
        vo.setWrterNm(dto.getWrterNm());
        vo.setCommentPassword(dto.getPassword());
        vo.setCommentCn(dto.getCommentCn());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterNm(dto.getWrterNm()); // Usually same or joined

        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString());
        }

        vo.setLastUpdusrId(dto.getLastUpdusrId());
        if (dto.getLastUpdusrPnttm() != null) {
            vo.setLastUpdusrPnttm(dto.getLastUpdusrPnttm().toString());
        }

        return vo;
    }

    public static CommentDto toDto(CommentVO vo) {
        return CommentDto.builder()
                .commentNo(vo.getCommentNo() != null && !vo.getCommentNo().isEmpty() ? Long.parseLong(vo.getCommentNo())
                        : null)
                .nttId(vo.getNttId())
                .bbsId(vo.getBbsId())
                .wrterId(vo.getWrterId())
                .wrterNm(vo.getWrterNm())
                .password(vo.getCommentPassword())
                .commentCn(vo.getCommentCn())
                .useAt(vo.getUseAt())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    // For legacy 'Comment' object which is used in insert/update
    public static CommentDto toDto(Comment legacyComment) {
        return CommentDto.builder()
                .commentNo(legacyComment.getCommentNo() != null && !legacyComment.getCommentNo().isEmpty()
                        ? Long.parseLong(legacyComment.getCommentNo())
                        : null)
                .nttId(legacyComment.getNttId())
                .bbsId(legacyComment.getBbsId())
                .wrterId(legacyComment.getWrterId())
                .wrterNm(legacyComment.getWrterNm())
                .password(legacyComment.getCommentPassword())
                .commentCn(legacyComment.getCommentCn())
                .useAt(legacyComment.getUseAt())
                .frstRegisterId(legacyComment.getFrstRegisterId())
                .build();
    }

    public static List<CommentVO> toVOList(List<CommentDto> dtoList) {
        if (dtoList == null)
            return List.of();
        return dtoList.stream()
                .map(CommentAdapter::toVO)
                .collect(Collectors.toList());
    }
}
