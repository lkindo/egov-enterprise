package nuri.business.service.deptjob.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.deptjob.DeptJob;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptJobDto {
    private String deptTaskId;
    private String deptTaskBoxId;
    private String deptTaskBoxNm;
    @Size(max = 20)
    private String deptId;
    private String deptNm;
    private String deptTaskNm;
    private String deptTaskCn;
    private String picId;
    private String picNm;
    private String prrtyRnk;
    @Size(max = 30)
    private String atchFileId;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;

    public static DeptJobDto from(DeptJob entity) {
        if (entity == null) return null;
        return DeptJobDto.builder()
                .deptTaskId(entity.getDeptTaskId())
                .deptTaskBoxId(entity.getDeptTaskBoxId())
                .deptTaskBoxNm(entity.getDeptJobBox() != null ? entity.getDeptJobBox().getDeptTaskBoxNm() : null)
                .deptTaskNm(entity.getDeptTaskNm())
                .deptTaskCn(entity.getDeptTaskCn())
                .picId(entity.getPicId())
                .prrtyRnk(entity.getPrrtyRnk())
                .atchFileId(entity.getAtchFileId())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }
}
