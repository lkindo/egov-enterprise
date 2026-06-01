package nuri.business.domain.deptjob;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 부서업무함
 *
 * @see NDEPTJOBBX 데이터베이스
 */
@Entity
@Table(name = "tb_dept_job_bx")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptJobBox extends BaseEntity {

    @Id
    @Column(name = "dept_task_box_id", length = 20)
    private String deptTaskBoxId;

    @Column(length = 100)
    private String deptTaskBoxNm;

    @Column(length = 20)
    private String deptId;

    private Integer sortOrdr;

    public void update(String deptTaskBoxNm, String deptId, Integer sortOrdr) {
        this.deptTaskBoxNm = deptTaskBoxNm;
        this.deptId = deptId;
        this.sortOrdr = sortOrdr;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
