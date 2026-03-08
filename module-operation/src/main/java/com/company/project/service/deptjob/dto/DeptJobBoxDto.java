package com.company.project.service.deptjob.dto;

import com.company.project.domain.deptjob.DeptJobBox;
import lombok.*;
import java.time.LocalDateTime;

/**
 * ???뾽?댄?DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptJobBoxDto {

    private String deptJobbxId;
    private String deptJobbxNm;
    private String deptId;
    private String deptNm;
    private Integer indictOrdr;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static DeptJobBoxDto fromEntity(DeptJobBox entity) {
        if (entity == null)
            return null;
        return DeptJobBoxDto.builder()
                .deptJobbxId(entity.getDeptJobbxId())
                .deptJobbxNm(entity.getDeptJobbxNm())
                .deptId(entity.getDeptId())
                .indictOrdr(entity.getIndictOrdr())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }

    public DeptJobBox toEntity() {
        return DeptJobBox.builder()
                .deptJobbxId(this.deptJobbxId)
                .deptJobbxNm(this.deptJobbxNm)
                .deptId(this.deptId)
                .indictOrdr(this.indictOrdr)
                .frstRegisterId(this.frstRegisterId)
                .frstRegistPnttm(this.frstRegistPnttm)
                .lastUpdusrId(this.lastUpdusrId)
                .lastUpdtPnttm(this.lastUpdtPnttm)
                .build();
    }
}
