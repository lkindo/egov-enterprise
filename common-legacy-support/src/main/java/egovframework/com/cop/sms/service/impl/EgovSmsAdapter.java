package egovframework.com.cop.sms.service.impl;

import com.company.project.service.sms.dto.SmsDto;
import egovframework.com.cop.sms.service.Sms;
import egovframework.com.cop.sms.service.SmsRecptn;
import egovframework.com.cop.sms.service.SmsVO;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.stream.Collectors;

public class EgovSmsAdapter {

    public static SmsDto toDto(Sms legacySms) {
        if (legacySms == null)
            return null;
        return SmsDto.builder()
                .smsId(legacySms.getSmsId())
                .trnsmitTelno(legacySms.getTrnsmitTelno())
                .trnsmitCn(legacySms.getTrnsmitCn())
                .recipients(legacySms.getRecptn() == null ? null
                        : legacySms.getRecptn().stream()
                                .map(r -> com.company.project.service.sms.dto.SmsRecptnDto.builder()
                                        .recptnTelno(r.getRecptnTelno())
                                        .build())
                                .collect(Collectors.toList()))
                .build();
    }

    public static SmsVO toVO(SmsDto dto) {
        if (dto == null)
            return null;
        SmsVO vo = new SmsVO();
        vo.setSmsId(dto.getSmsId());
        vo.setTrnsmitTelno(dto.getTrnsmitTelno());
        vo.setTrnsmitCn(dto.getTrnsmitCn());
        vo.setUniqId(dto.getUniqId());
        if (dto.getRecipients() != null) {
            vo.setRecptn(dto.getRecipients().stream()
                    .map(r -> {
                        SmsRecptn lr = new SmsRecptn();
                        lr.setSmsId(dto.getSmsId());
                        lr.setRecptnTelno(r.getRecptnTelno());
                        lr.setResultCode(r.getResultCode());
                        lr.setResultMssage(r.getResultMssage());
                        return lr;
                    })
                    .collect(Collectors.toList()));
        }
        return vo;
    }

    public static List<SmsVO> toVOList(Page<SmsDto> page) {
        return page.getContent().stream()
                .map(EgovSmsAdapter::toVO)
                .collect(Collectors.toList());
    }
}
