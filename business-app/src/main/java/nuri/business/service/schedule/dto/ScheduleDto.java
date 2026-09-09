package nuri.business.service.schedule.dto;

import nuri.foundation.core.validation.Ymd;
import nuri.foundation.core.validation.YmdRange;

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
@YmdRange(start = "schdlBgngYmd", end = "schdlEndYmd")
public class ScheduleDto {
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private Long schdlSn;

    @Size(max = 12)
    private String schdlSeCd;

    @Size(max = 300)
    @NotBlank
    private String schdlNm;

    @Size(max = 4000)
    private String schdlCn;

    @Size(max = 12)
    private String reptSeCd;

    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String schdlBgngYmd;
    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String schdlEndYmd;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private String schdlIpAddr;

    @Size(max = 20)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private String schdlPicId;
    private Long atchFileSn;
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private String frstRgtrId;
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private LocalDateTime crtDt;
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private String lastMdfrId;
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private LocalDateTime mdfcnDt;
    
    // Additional fields for service
    @Size(max = 20)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private String schdlDeptId;

    @Size(max = 12)
    private String schdlKndCd;

    @Size(max = 100)
    private String schdlPlcNm;

    @Size(max = 12)
    private String schdlImprtCd;

    // 엔티티→DTO 변환은 프레임워크 표준 MapStruct 매퍼 {@link ScheduleMapper} 로 이관되었다.
}
