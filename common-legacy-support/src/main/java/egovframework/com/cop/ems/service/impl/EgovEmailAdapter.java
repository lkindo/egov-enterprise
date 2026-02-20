package egovframework.com.cop.ems.service.impl;

import com.company.project.service.mail.dto.SentMailDto;
import egovframework.com.cop.ems.service.SndngMailVO;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.stream.Collectors;

public class EgovEmailAdapter {

    public static SentMailDto toDto(SndngMailVO vo) {
        if (vo == null)
            return null;
        return SentMailDto.builder()
                .mssageId(vo.getMssageId())
                .sj(vo.getSj())
                .emailCn(vo.getEmailCn())
                .dsptchPerson(vo.getDsptchPerson())
                .recptnPerson(vo.getRecptnPerson())
                .atchFileId(vo.getAtchFileId())
                .build();
    }

    public static SndngMailVO toVO(SentMailDto dto) {
        if (dto == null)
            return null;
        SndngMailVO vo = new SndngMailVO();
        vo.setMssageId(dto.getMssageId());
        vo.setSj(dto.getSj());
        vo.setEmailCn(dto.getEmailCn());
        vo.setDsptchPerson(dto.getDsptchPerson());
        vo.setRecptnPerson(dto.getRecptnPerson());
        vo.setSndngResultCode(dto.getSndngResultCode());
        vo.setSndngDe(dto.getSndngDe());
        vo.setAtchFileId(dto.getAtchFileId());
        return vo;
    }

    public static List<SndngMailVO> toVOList(Page<SentMailDto> page) {
        return page.getContent().stream()
                .map(EgovEmailAdapter::toVO)
                .collect(Collectors.toList());
    }
}
