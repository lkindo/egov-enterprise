package nuri.foundation.service.operation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import nuri.foundation.domain.operation.EventInfo;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class EventInfoDto {
    private String eventId;
    
    @JsonProperty("eventNm")
    private String bsnsCode; // Mapping bsnsCode to eventNm as a temporary measure if name is missing, 
                             // OR better, we will assume eventNm is part of the contract now.
                             
    private String bsnsYear;
    private String eventCn;
    
    @JsonProperty("eventBeginDe")
    private String eventSvcBgnde;
    
    @JsonProperty("eventEndDe")
    private String eventSvcEndde;
    
    @JsonProperty("psncpa")
    private Long svcUseNmprCo;
    
    private String chargerNm;
    private String prparetgCn;
    private String eventTyCode;
    private String eventConfmAt;
    private String eventConfmDe;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    // Aliases for Frontend Compatibility
    @JsonProperty("eventNm")
    public String getEventNm() { return this.eventCn != null && this.eventCn.length() > 20 ? this.eventCn.substring(0, 20) : this.eventCn; }

    @JsonProperty("rceptBeginDe")
    public String getRceptBeginDe() { return this.eventSvcBgnde; }

    @JsonProperty("rceptEndDe")
    public String getRceptEndDe() { return this.eventSvcEndde; }

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
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
