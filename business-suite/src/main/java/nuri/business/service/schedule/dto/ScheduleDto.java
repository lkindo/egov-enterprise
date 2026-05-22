package nuri.business.service.schedule.dto;

import nuri.business.domain.schedule.Schedule;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleDto {
    private String schdlId;

    @com.fasterxml.jackson.annotation.JsonProperty("schdulSe")
    private String schdlSeCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlTtl")
    private String schdlNm;

    private String schdlCn;

    @com.fasterxml.jackson.annotation.JsonProperty("reptitSeCode")
    private String reptSeCd;

    private String schdlBgngYmd;
    private String schdlEndYmd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdulIpAdres")
    private String schdlIpAddr;

    @com.fasterxml.jackson.annotation.JsonProperty("schdulChargerId")
    private String schdlPicId;

    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime createdDate;
    private String lastUpdusrId;
    private LocalDateTime modifiedDate;
    
    // Additional fields for service
    private String schdlDeptId;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlKindCd")
    private String schdlKndCd;

    private String schdlPlcNm;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlIpcrCd")
    private String schdlImprtCd;

    // legacy
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulId() { return schdlId; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulNm() { return schdlNm; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulCn() { return schdlCn; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulBgnde() { return schdlBgngYmd; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulEndde() { return schdlEndYmd; }
    
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulSe() { return schdlSeCd; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulIpAdres() { return schdlIpAddr; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulChargerId() { return schdlPicId; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getReptitSeCode() { return reptSeCd; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdlKindCd() { return schdlKndCd; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdlIpcrCd() { return schdlImprtCd; }

    public static ScheduleDto from(Schedule entity) {
        if (entity == null) return null;
        return ScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .schdlSeCd(entity.getSchdlSeCd())
                .schdlNm(entity.getSchdlNm())
                .schdlCn(entity.getSchdlCn())
                .reptSeCd(entity.getReptSeCd())
                .schdlBgngYmd(entity.getSchdlBgngYmd())
                .schdlEndYmd(entity.getSchdlEndYmd())
                .schdlIpAddr(entity.getSchdlIpAddr())
                .schdlPicId(entity.getSchdlPicId())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .modifiedDate(entity.getLastModifiedDate())
                .schdlDeptId(entity.getSchdlDeptId())
                .schdlKndCd(entity.getSchdlKndCd())
                .schdlPlcNm(entity.getSchdlPlcNm())
                .schdlImprtCd(entity.getSchdlImprtCd())
                .build();
    }
}
