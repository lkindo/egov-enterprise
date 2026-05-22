package nuri.foundation.service.operation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import nuri.foundation.domain.operation.EventInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class EventInfoDto {

    @JsonProperty("eventId")
    @JsonAlias({"eventId", "evntId"})
    private String evntId;
    
    @JsonProperty("eventNm")
    @JsonAlias({"eventNm", "bsnsCode", "bizCd"})
    private String bizCd; // Mapping bsnsCode to eventNm as a temporary measure if name is missing
                             
    @JsonProperty("bsnsYear")
    @JsonAlias({"bsnsYear", "bizYr"})
    private String bizYr;

    @JsonProperty("eventCn")
    @JsonAlias({"eventCn", "evntCn"})
    private String evntCn;
    
    @JsonProperty("eventBeginDe")
    @JsonAlias({"eventBeginDe", "eventSvcBgnde", "evntBgngYmd"})
    private String evntBgngYmd;
    
    @JsonProperty("eventEndDe")
    @JsonAlias({"eventEndDe", "eventSvcEndde", "evntEndYmd"})
    private String evntEndYmd;
    
    @JsonProperty("psncpa")
    @JsonAlias({"psncpa", "svcUseNmprCo", "evntUseCnt"})
    private Long evntUseCnt;
    
    @JsonProperty("chargerNm")
    @JsonAlias({"chargerNm", "picNm"})
    private String picNm;

    @JsonProperty("prparetgCn")
    @JsonAlias({"prparetgCn", "prepMttr"})
    private String prepMttr;

    @JsonProperty("eventTyCode")
    @JsonAlias({"eventTyCode", "evntTypeCd"})
    private String evntTypeCd;

    @JsonProperty("eventConfmAt")
    @JsonAlias({"eventConfmAt", "evntAprvYn"})
    private String evntAprvYn;

    @JsonProperty("eventConfmDe")
    @JsonAlias({"eventConfmDe", "evntAprvYmd"})
    private String evntAprvYmd;

    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    // Aliases for Frontend Compatibility
    @JsonProperty("rceptBeginDe")
    public String getRceptBeginDe() { return this.evntBgngYmd; }

    @JsonProperty("rceptEndDe")
    public String getRceptEndDe() { return this.evntEndYmd; }

    public static EventInfoDto from(EventInfo entity) {
        return EventInfoDto.builder()
                .evntId(entity.getEvntId())
                .bizYr(entity.getBizYr())
                .bizCd(entity.getBizCd())
                .evntCn(entity.getEvntCn())
                .evntBgngYmd(entity.getEvntBgngYmd())
                .evntEndYmd(entity.getEvntEndYmd())
                .evntUseCnt(entity.getEvntUseCnt())
                .picNm(entity.getPicNm())
                .prepMttr(entity.getPrepMttr())
                .evntTypeCd(entity.getEvntTypeCd())
                .evntAprvYn(entity.getEvntAprvYn())
                .evntAprvYmd(entity.getEvntAprvYmd())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
