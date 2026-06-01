package nuri.business.service.deptjob.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.deptjob.DeptJobBox;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptJobBoxDto {

    private String deptTaskBoxId;
    private String deptTaskBoxNm;
    @Size(max = 20)
    private String deptId;
    private String deptNm;
    private Integer sortOrdr;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static DeptJobBoxDto fromEntity(DeptJobBox entity) {
        if (entity == null)
            return null;
        return DeptJobBoxDto.builder()
                .deptTaskBoxId(entity.getDeptTaskBoxId())
                .deptTaskBoxNm(entity.getDeptTaskBoxNm())
                .deptId(entity.getDeptId())
                .sortOrdr(entity.getSortOrdr())
                .frstRegisterId(entity.getFrstRgtrId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastMdfrId())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .build();
    }

    public DeptJobBox toEntity() {
        return DeptJobBox.builder()
                .deptTaskBoxId(this.deptTaskBoxId)
                .deptTaskBoxNm(this.deptTaskBoxNm)
                .deptId(this.deptId)
                .sortOrdr(this.sortOrdr)
                .build();
    }
}
