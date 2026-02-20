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
@Schema(description = "Description")
public class DeptManageDto {

    @Schema(description = "Description")
    private String orgnztId;

    @Schema(description = "Description")
    private String orgnztNm;

    @Schema(description = "Description")
    private String orgnztDc;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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
