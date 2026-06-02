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
    private String schdulId;

    @Size(max = 12)
    private String schdulSe;

    @Size(max = 100)
    @NotBlank
    private String schdulNm;

    @Size(max = 4000)
    private String schdulCn;

    @Size(max = 12)
    private String reptitSeCode;

    @Size(max = 8)
    private String schdulBgnde;
    @Size(max = 8)
    private String schdulEndde;

    private String schdulIpAdres;

    @Size(max = 20)
    private String schdulChargerId;

    @Size(max = 30)
    private String atchFileId;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime modifiedDate;
    
    // Additional fields for service
    @Size(max = 20)
    private String schdulDeptId;

    @Size(max = 12)
    private String schdulKindCode;

    @Size(max = 100)
    private String schdulPlace;

    @Size(max = 12)
    private String schdulIpcrCode;

    public static ScheduleDto from(Schedule entity) {
        if (entity == null) return null;
        return ScheduleDto.builder()
                .schdulId(entity.getSchdlId())
                .schdulSe(entity.getSchdlSeCd())
                .schdulNm(entity.getSchdlNm())
                .schdulCn(entity.getSchdlCn())
                .reptitSeCode(entity.getReptSeCd())
                .schdulBgnde(entity.getSchdlBgngYmd())
                .schdulEndde(entity.getSchdlEndYmd())
                .schdulIpAdres(entity.getSchdlIpAddr())
                .schdulChargerId(entity.getSchdlPicId())
                .atchFileId(entity.getAtchFileId())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .modifiedDate(entity.getMdfcnDt())
                .schdulDeptId(entity.getSchdlDeptId())
                .schdulKindCode(entity.getSchdlKndCd())
                .schdulPlace(entity.getSchdlPlcNm())
                .schdulIpcrCode(entity.getSchdlImprtCd())
                .build();
    }
}
