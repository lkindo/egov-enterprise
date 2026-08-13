package nuri.business.service.deptjob.dto;

import jakarta.validation.constraints.*;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptJobDto {
    private String deptTaskId;
    private Long deptTaskBoxSn;
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
}
