package com.company.project.service.event.dto;

import com.company.project.domain.event.EventInfo;
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
@Schema(description = "Description")
public class EventInfoDto {

    @Schema(description = "Description")
    private String eventId;

    @Schema(description = "Description")
    private String eventSvcBeginDe;

    @Schema(description = "Description")
    private String eventSvcEndDe;

    @Schema(description = "Description")
    private Integer svcUseNmprCo;

    @Schema(description = "Description")
    private String chargerNm;

    @Schema(description = "Description")
    private String eventCn;

    @Schema(description = "Description")
    private String eventTyCode;

    @Schema(description = "Description")
    private String eventTyCodeNm;

    @Schema(description = "Description")
    private String prparetgCn;

    @Schema(description = "Description")
    private String eventConfmAt;

    @Schema(description = "Description")
    private String eventConfmDe;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    @Schema(description = "Description")
    private List<ExternalHrDto> externalHrs;

    public static EventInfoDto from(EventInfo entity) {
        if (entity == null) return null;
        return EventInfoDto.builder()
                .eventId(entity.getEventId())
                .eventSvcBeginDe(entity.getEventSvcBeginDe())
                .eventSvcEndDe(entity.getEventSvcEndDe())
                .svcUseNmprCo(entity.getSvcUseNmprCo())
                .chargerNm(entity.getChargerNm())
                .eventCn(entity.getEventCn())
                .eventTyCode(entity.getEventTyCode())
                .prparetgCn(entity.getPrparetgCn())
                .eventConfmAt(entity.getEventConfmAt())
                .eventConfmDe(entity.getEventConfmDe())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .externalHrs(entity.getExternalHrs() != null ?
                        entity.getExternalHrs().stream()
                        .map(ExternalHrDto::from)
                        .collect(Collectors.toList()) : null)
                .build();
    }
}
