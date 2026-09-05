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

    private Long deptTaskBoxSn;
    // [2026-09-06 DEC-OPS-037] @Size(100) 은 컬럼 폭 미러(V2_0 dept_task_box_nm varchar(100)). @NotBlank 는 물리 제약이
    //   아니라 제품 규칙이다(컬럼은 nullable) — 이름 없는 업무함은 업무 등록 폼의 선택지와 목록에서 빈칸으로 보인다.
    @NotBlank
    @Size(max = 100)
    private String deptTaskBoxNm;
    @Size(max = 20)
    private String deptId;
    private String deptNm;
    private Long sortOrdr;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;

    public static DeptJobBoxDto fromEntity(DeptJobBox entity) {
        if (entity == null)
            return null;
        return DeptJobBoxDto.builder()
                .deptTaskBoxSn(entity.getDeptTaskBoxSn())
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
                .deptTaskBoxSn(this.deptTaskBoxSn)
                .deptTaskBoxNm(this.deptTaskBoxNm)
                .deptId(this.deptId)
                .sortOrdr(this.sortOrdr)
                .build();
    }
}
