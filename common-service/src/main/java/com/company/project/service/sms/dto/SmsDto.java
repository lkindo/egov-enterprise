package com.company.project.service.sms.dto;

import com.company.project.domain.sms.Sms;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "SMS 정보 DTO")
public class SmsDto {

    @Schema(description = "SMS ID")
    private String smsId;

    @Schema(description = "발신 전화번호")
    private String trnsmitTelno;

    @Schema(description = "발신 내용")
    private String trnsmitCn;

    @Schema(description = "수신 건수")
    private Integer recptnCnt;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "수신자 목록")
    private List<SmsRecptnDto> recipients;

    public static SmsDto from(Sms entity) {
        if (entity == null) return null;
        return SmsDto.builder()
                .smsId(entity.getSmsId())
                .trnsmitTelno(entity.getTrnsmitTelno())
                .trnsmitCn(entity.getTrnsmitCn())
                .recptnCnt(entity.getRecipients() != null ? entity.getRecipients().size() : 0)
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .recipients(entity.getRecipients() != null ? 
                        entity.getRecipients().stream()
                        .map(SmsRecptnDto::from)
                        .collect(Collectors.toList()) : null)
                .build();
    }
}
