package nuri.business.service.schedule.dto;

import jakarta.validation.constraints.*;

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

    // 엔티티→DTO 변환은 프레임워크 표준 MapStruct 매퍼 {@link ScheduleMapper} 로 이관되었다.
}
