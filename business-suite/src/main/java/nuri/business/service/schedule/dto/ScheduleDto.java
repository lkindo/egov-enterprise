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

    @Size(max = 12)
    private String schdlSeCd;

    @Size(max = 100)
    @NotBlank
    private String schdlNm;

    @Size(max = 4000)
    private String schdlCn;

    @Size(max = 12)
    private String reptSeCd;

    @Size(max = 8)
    private String schdlBgngYmd;
    @Size(max = 8)
    private String schdlEndYmd;

    private String schdlIpAddr;

    @Size(max = 20)
    private String schdlPicId;

    @Size(max = 30)
    private String atchFileId;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
    
    // Additional fields for service
    @Size(max = 20)
    private String schdlDeptId;

    @Size(max = 12)
    private String schdlKndCd;

    @Size(max = 100)
    private String schdlPlcNm;

    @Size(max = 12)
    private String schdlImprtCd;

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
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .schdlDeptId(entity.getSchdlDeptId())
                .schdlKndCd(entity.getSchdlKndCd())
                .schdlPlcNm(entity.getSchdlPlcNm())
                .schdlImprtCd(entity.getSchdlImprtCd())
                .build();
    }
}
