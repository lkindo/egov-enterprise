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

    /**
     * 시작일. [2026-10-18] 등록·수정에서는 필수다 — 월별·기간 조회가 시작일로 거르므로(ScheduleRepository) 시작일 없는
     * 일정은 어느 달력에도 나타나지 않았다. 필수 판정은 {@code ScheduleService} 가 한다: 이 DTO 는 응답에도 쓰이고 물리
     * 컬럼은 nullable 이라, 여기 {@code @NotBlank} 를 두면 생성 응답 계약이 시작일을 필수로 바꿔 시작일 없이 저장된
     * 기존 일정의 목록·달력 응답이 화면의 계약 검증에서 통째로 실패한다.
     */
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

    /** 현재 사용자가 이 일정을 고칠 수 있는가(서버 판정, 2026-09-26 DIP B4 P5). 인가는 쓰기 경로가 그대로 집행한다. */
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(description = "현재 사용자가 수정할 수 있는지(서버 판정)",
            accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private Boolean editable;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @io.swagger.v3.oas.annotations.media.Schema(description = "현재 사용자가 삭제할 수 있는지(서버 판정)",
            accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    private Boolean deletable;

    @io.swagger.v3.oas.annotations.media.Schema(description = "낙관적 잠금 버전(V2_133). 조회한 값을 수정 요청에 그대로 돌려보내며 수정할 때 필수다 — 다르면 409. 등록에서는 무시한다.")
    @Min(0)
    private Integer version;

    // 엔티티→DTO 변환은 프레임워크 표준 MapStruct 매퍼 {@link ScheduleMapper} 로 이관되었다.
}
