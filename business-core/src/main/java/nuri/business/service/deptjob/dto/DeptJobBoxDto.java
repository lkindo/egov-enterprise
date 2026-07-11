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
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;

    public static DeptJobBoxDto fromEntity(DeptJobBox entity) {
        if (entity == null)
            return null;
        return DeptJobBoxDto.builder()
                .deptTaskBoxId(entity.getDeptTaskBoxId())
                .deptTaskBoxNm(entity.getDeptTaskBoxNm())
                .deptId(entity.getDeptId())
                .sortOrdr(entity.getSortOrdr())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
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
