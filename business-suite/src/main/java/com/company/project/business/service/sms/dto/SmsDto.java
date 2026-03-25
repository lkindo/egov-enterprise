package com.company.project.business.service.sms.dto;

import com.company.project.business.domain.sms.Sms;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class SmsDto {

    @Schema(description = "SMS ID")
    private String smsId;

    @Schema(description = "Description")
    private String trnsmitTelno;

    @Schema(description = "Description")
    private String trnsmitCn;

    @Schema(description = "Description")
    private Integer recptnCnt;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    @Schema(description = "Description")
    private String uniqId;

    public String getFrstRegisterId() {
        return createdBy;
    }

    public LocalDateTime getFrstRegisterPnttm() {
        return createdDate;
    }

    @Schema(description = "Description")
    private List<SmsRecptnDto> recipients;

    @Schema(description = "Description")
    private String searchCondition;

    @Schema(description = "Description")
    private String searchWrd;

    public static SmsDto from(Sms entity) {
        if (entity == null)
            return null;
        return SmsDto.builder()
                .smsId(entity.getSmsId())
                .trnsmitTelno(entity.getTrnsmitTelno())
                .trnsmitCn(entity.getTrnsmitCn())
                .recptnCnt(0)
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .recipients(null)
                .build();
    }
}
