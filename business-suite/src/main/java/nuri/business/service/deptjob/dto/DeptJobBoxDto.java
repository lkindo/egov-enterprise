package nuri.business.service.deptjob.dto;

import nuri.business.domain.deptjob.DeptJobBox;
import lombok.*;
import java.time.LocalDateTime;

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
    private LocalDateTime frstRegisterPnttm;
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
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .build();
    }

    public DeptJobBox toEntity() {
        return DeptJobBox.builder()
                .deptJobbxId(this.deptJobbxId)
                .deptJobbxNm(this.deptJobbxNm)
                .deptId(this.deptId)
                .indictOrdr(this.indictOrdr)
                .build();
    }
}
