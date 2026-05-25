package nuri.foundation.service.operation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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

    private String evntId;
    private String bizCd; // Mapping bsnsCode to eventNm as a temporary measure if name is missing
    private String bizYr;
    private String evntCn;
    private String evntBgngYmd;
    private String evntEndYmd;
    private Long evntUseCnt;
    private String picNm;
    private String prepMttr;
    private String evntTypeCd;
    private String evntAprvYn;
    private String evntAprvYmd;

    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

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
