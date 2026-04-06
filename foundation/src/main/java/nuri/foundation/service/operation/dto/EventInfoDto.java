package nuri.foundation.service.operation.dto;

import nuri.foundation.domain.operation.EventInfo;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class EventInfoDto {
    private String eventId;
    private String bsnsYear;
    private String bsnsCode;
    private String eventCn;
    private String eventSvcBgnde;
    private String eventSvcEndde;
    private Long svcUseNmprCo;
    private String chargerNm;
    private String prparetgCn;
    private String eventTyCode;
    private String eventConfmAt;
    private String eventConfmDe;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static EventInfoDto from(EventInfo entity) {
        return EventInfoDto.builder()
                .eventId(entity.getEventId())
                .bsnsYear(entity.getBsnsYear())
                .bsnsCode(entity.getBsnsCode())
                .eventCn(entity.getEventCn())
                .eventSvcBgnde(entity.getEventSvcBgnde())
                .eventSvcEndde(entity.getEventSvcEndde())
                .svcUseNmprCo(entity.getSvcUseNmprCo())
                .chargerNm(entity.getChargerNm())
                .prparetgCn(entity.getPrparetgCn())
                .eventTyCode(entity.getEventTyCode())
                .eventConfmAt(entity.getEventConfmAt())
                .eventConfmDe(entity.getEventConfmDe())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
