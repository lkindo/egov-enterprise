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
    @com.fasterxml.jackson.annotation.JsonProperty("deptJobId")
    private String deptTaskId;

    @Column(name = "dept_task_box_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("deptJobbxId")
    private String deptTaskBoxId;

    @Column(name = "dept_task_nm", length = 100)
    @com.fasterxml.jackson.annotation.JsonProperty("deptJobNm")
    private String deptTaskNm;

    @Column(name = "dept_task_cn", columnDefinition = "TEXT", length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("deptJobCn")
    private String deptTaskCn;

    @Column(name = "pic_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("chargerId")
    private String picId;

    @Column(name = "prrty_rnk", length = 12)
    @com.fasterxml.jackson.annotation.JsonProperty("priort")
    private String prrtyRnk; // 1: 높음, 2: 보통, 3: 낮음

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    public void update(String deptJobbxId, String deptJobNm, String deptJobCn, String chargerId, String priort,
            String atchFileId) {
        this.deptTaskBoxId = deptJobbxId;
        this.deptTaskNm = deptJobNm;
        this.deptTaskCn = deptJobCn;
        this.picId = chargerId;
        this.prrtyRnk = priort;
        this.atchFileId = atchFileId;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getDeptJobId() { return this.deptTaskId; }
    public void setDeptJobId(String v) { this.deptTaskId = v; }

    public String getDeptJobbxId() { return this.deptTaskBoxId; }
    public void setDeptJobbxId(String v) { this.deptTaskBoxId = v; }

    public String getDeptJobNm() { return this.deptTaskNm; }
    public void setDeptJobNm(String v) { this.deptTaskNm = v; }

    public String getDeptJobCn() { return this.deptTaskCn; }
    public void setDeptJobCn(String v) { this.deptTaskCn = v; }

    public String getChargerId() { return this.picId; }
    public void setChargerId(String v) { this.picId = v; }

    public String getPriort() { return this.prrtyRnk; }
    public void setPriort(String v) { this.prrtyRnk = v; }

    public static abstract class DeptJobBuilder<C extends DeptJob, B extends DeptJobBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String deptTaskId;
        private String deptTaskBoxId;
        private String deptTaskNm;
        private String deptTaskCn;
        private String picId;
        private String prrtyRnk;

        public B deptJobId(String deptJobId) {
            this.deptTaskId = deptJobId;
            return self();
        }
        public B deptJobbxId(String deptJobbxId) {
            this.deptTaskBoxId = deptJobbxId;
            return self();
        }
        public B deptJobNm(String deptJobNm) {
            this.deptTaskNm = deptJobNm;
            return self();
        }
        public B deptJobCn(String deptJobCn) {
            this.deptTaskCn = deptJobCn;
            return self();
        }
        public B chargerId(String chargerId) {
            this.picId = chargerId;
            return self();
        }
        public B priort(String priort) {
            this.prrtyRnk = priort;
            return self();
        }
    }
}
