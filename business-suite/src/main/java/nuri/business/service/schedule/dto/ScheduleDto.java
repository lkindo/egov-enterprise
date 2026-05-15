package nuri.business.service.schedule.dto;

import nuri.business.domain.schedule.Schedule;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleDto {
    private String schdlId;
    private String schdlSeCd;
    private String schdlDeptId;
    private String schdlKindCd;
    private String schdlBgngYmd;
    private String schdlEndYmd;
    private String schdlTtl;
    private String schdlCn;
    private String schdlPlcNm;
    private String schdlIpcrCd;
    private String schdlPicId;
    private String atchFileId;
    private String reptitSeCd;
    private String frstRegisterId;
    private LocalDateTime createdDate;
    private String lastUpdusrId;
    private LocalDateTime modifiedDate;

    public static ScheduleDto from(Schedule entity) {
        if (entity == null) return null;
        return ScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .schdlSeCd(entity.getSchdlSeCd())
                .schdlDeptId(entity.getSchdlDeptId())
                .schdlKindCd(entity.getSchdlKindCd())
                .schdlBgngYmd(entity.getSchdlBgngYmd())
                .schdlEndYmd(entity.getSchdlEndYmd())
                .schdlTtl(entity.getSchdlTtl())
                .schdlCn(entity.getSchdlCn())
                .schdlPlcNm(entity.getSchdlPlcNm())
                .schdlIpcrCd(entity.getSchdlIpcrCd())
                .schdlPicId(entity.getSchdlPicId())
                .atchFileId(entity.getAtchFileId())
                .reptitSeCd(entity.getReptitSeCd())
                .frstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .modifiedDate(entity.getLastModifiedDate())
                .build();
    }
}
