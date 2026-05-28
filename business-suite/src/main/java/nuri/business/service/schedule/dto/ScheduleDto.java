package nuri.business.service.schedule.dto;

import jakarta.validation.constraints.*;

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
    @Size(max = 20)
    private String schdlId;

    @com.fasterxml.jackson.annotation.JsonProperty("schdulSe")
    @Size(max = 12)
    private String schdlSeCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlTtl")
    @Size(max = 100)
    @NotBlank
    private String schdlNm;

    @Size(max = 4000)
    private String schdlCn;

    @com.fasterxml.jackson.annotation.JsonProperty("reptitSeCode")
    @Size(max = 12)
    private String reptSeCd;

    @Size(max = 8)
    private String schdlBgngYmd;
    @Size(max = 8)
    private String schdlEndYmd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdulIpAdres")
    private String schdlIpAddr;

    @com.fasterxml.jackson.annotation.JsonProperty("schdulChargerId")
    @Size(max = 20)
    private String schdlPicId;

    @Size(max = 30)
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime createdDate;
    private String lastUpdusrId;
    private LocalDateTime modifiedDate;
    
    // Additional fields for service
    @Size(max = 20)
    private String schdlDeptId;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlKindCd")
    @Size(max = 12)
    private String schdlKndCd;

    @Size(max = 100)
    private String schdlPlcNm;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlIpcrCd")
    @Size(max = 12)
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
