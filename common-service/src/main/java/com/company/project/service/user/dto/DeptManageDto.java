package com.company.project.service.user.dto;

import com.company.project.domain.user.entity.DeptManage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "부??조직) ?�보 DTO")
public class DeptManageDto {

    @Schema(description = "조직 ID")
    private String orgnztId;

    @Schema(description = "조직 �?)
    private String orgnztNm;

    @Schema(description = "조직 ?�명")
    private String orgnztDc;

    @Schema(description = "?�록??ID")
    private String createdBy;

    @Schema(description = "?�록?�시")
    private LocalDateTime createdDate;

    public static DeptManageDto from(DeptManage entity) {
        if (entity == null) return null;
        return DeptManageDto.builder()
                .orgnztId(entity.getOrgnztId())
                .orgnztNm(entity.getOrgnztNm())
                .orgnztDc(entity.getOrgnztDc())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
