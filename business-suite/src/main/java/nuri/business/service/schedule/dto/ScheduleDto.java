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
    private String schdulSe;
    private String schdlTtl;
    private String schdlCn;
    private String reptitSeCode;
    private String schdlBgngYmd;
    private String schdlEndYmd;
    private String schdulIpAdres;
    private String schdulChargerId;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime createdDate;
    private String lastUpdusrId;
    private LocalDateTime modifiedDate;
    
    // Additional fields for service
    private String schdlDeptId;
    private String schdlKindCd;
    private String schdlPlcNm;
    private String schdlIpcrCd;
    private String schdlPicId;
    private String reptitSeCd;
    private String schdlSeCd;

    // legacy
    public String getSchdulId() { return schdlId; }
    public String getSchdulNm() { return schdlTtl; }
    public String getSchdulCn() { return schdlCn; }
    public String getSchdulBgnde() { return schdlBgngYmd; }
    public String getSchdulEndde() { return schdlEndYmd; }
    
    // mapping compatibility
    public String getSchdlSeCd() { return schdulSe != null ? schdulSe : schdlSeCd; }
    public String getSchdlPicId() { return schdulChargerId != null ? schdulChargerId : schdlPicId; }
    public String getReptitSeCd() { return reptitSeCode != null ? reptitSeCode : reptitSeCd; }

    public static ScheduleDto from(Schedule entity) {
        if (entity == null) return null;
        return ScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .schdulSe(entity.getSchdlSeCd())
                .schdlTtl(entity.getSchdlTtl())
                .schdlCn(entity.getSchdlCn())
                .reptitSeCode(entity.getReptitSeCd())
                .schdlBgngYmd(entity.getSchdlBgngYmd())
                .schdlEndYmd(entity.getSchdlEndYmd())
                .schdulIpAdres(entity.getSchdlIpAddr())
                .schdulChargerId(entity.getSchdlPicId())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .modifiedDate(entity.getLastModifiedDate())
                .build();
    }
}
