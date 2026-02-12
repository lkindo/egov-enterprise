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
@Schema(description = "이벤트 정보 DTO")
public class EventInfoDto {

    @Schema(description = "이벤트 ID")
    private String eventId;

    @Schema(description = "이벤트 서비스 시작일")
    private String eventSvcBeginDe;

    @Schema(description = "이벤트 서비스 종료일")
    private String eventSvcEndDe;

    @Schema(description = "서비스 이용 인원 수")
    private Integer svcUseNmprCo;

    @Schema(description = "담당자 명")
    private String chargerNm;

    @Schema(description = "이벤트 내용")
    private String eventCn;

    @Schema(description = "이벤트 유형 코드")
    private String eventTyCode;

    @Schema(description = "이벤트 유형 명")
    private String eventTyCodeNm;

    @Schema(description = "준비 내용")
    private String prparetgCn;

    @Schema(description = "이벤트 승인 여부")
    private String eventConfmAt;

    @Schema(description = "이벤트 승인 일자")
    private String eventConfmDe;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "외부 인력 목록")
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
