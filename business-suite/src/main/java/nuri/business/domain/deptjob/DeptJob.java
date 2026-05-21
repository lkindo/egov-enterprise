package nuri.business.domain.deptjob;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "tb_dept_task_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptJob extends BaseEntity {

    @Id
    @Column(name = "dept_task_id", length = 20)
    private String deptJobId;

    @Column(name = "dept_task_box_id", length = 20)
    private String deptJobbxId;

    @Column(name = "dept_task_nm", length = 255)
    private String deptJobNm;

    @Column(name = "dept_task_cn", columnDefinition = "TEXT")
    private String deptJobCn;

    @Column(name = "pic_id", length = 20)
    private String chargerId;

    @Column(name = "prrty_rnk", length = 1)
    private String priort; // 1: 높음, 2: 보통, 3: 낮음

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    public void update(String deptJobbxId, String deptJobNm, String deptJobCn, String chargerId, String priort,
            String atchFileId) {
        this.deptJobbxId = deptJobbxId;
        this.deptJobNm = deptJobNm;
        this.deptJobCn = deptJobCn;
        this.chargerId = chargerId;
        this.priort = priort;
        this.atchFileId = atchFileId;
    }
}
