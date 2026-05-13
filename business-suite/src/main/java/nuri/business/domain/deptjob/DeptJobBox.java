package nuri.business.domain.deptjob;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 부서업무함
 *
 * @see NDEPTJOBBX 데이터베이스
 */
@Entity
@Table(name = "TB_DEPT_JOB_BX")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptJobBox extends BaseEntity {

    @Id
    @Column(name = "DEPT_JOB_BX_ID", length = 20)
    private String deptJobbxId;

    @Column(name = "DEPT_JOB_BX_NM", length = 100)
    private String deptJobbxNm;

    @Column(name = "dept_id", length = 20)
    private String deptId;

    @Column(name = "SORT_ORDR")
    private Integer indictOrdr;

    public void update(String deptJobbxNm, String deptId, Integer indictOrdr) {
        this.deptJobbxNm = deptJobbxNm;
        this.deptId = deptId;
        this.indictOrdr = indictOrdr;
    }
}
