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
@Table(name = "tb_dept_job_bx")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptJobBox extends BaseEntity {

    @Id
    @Column(name = "dept_task_box_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("deptJobbxId")
    private String deptTaskBoxId;

    @Column(length = 100)
    @com.fasterxml.jackson.annotation.JsonProperty("deptJobbxNm")
    private String deptTaskBoxNm;

    @Column(length = 20)
    private String deptId;

    @com.fasterxml.jackson.annotation.JsonProperty("indictOrdr")
    private Integer sortOrdr;

    public void update(String deptJobbxNm, String deptId, Integer indictOrdr) {
        this.deptTaskBoxNm = deptJobbxNm;
        this.deptId = deptId;
        this.sortOrdr = indictOrdr;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getDeptJobbxId() { return this.deptTaskBoxId; }
    public void setDeptJobbxId(String v) { this.deptTaskBoxId = v; }

    public String getDeptJobbxNm() { return this.deptTaskBoxNm; }
    public void setDeptJobbxNm(String v) { this.deptTaskBoxNm = v; }

    public Integer getIndictOrdr() { return this.sortOrdr; }
    public void setIndictOrdr(Integer v) { this.sortOrdr = v; }

    public static abstract class DeptJobBoxBuilder<C extends DeptJobBox, B extends DeptJobBoxBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String deptTaskBoxId;
        private String deptTaskBoxNm;
        private Integer sortOrdr;

        public B deptJobbxId(String deptJobbxId) {
            this.deptTaskBoxId = deptJobbxId;
            return self();
        }
        public B deptJobbxNm(String deptJobbxNm) {
            this.deptTaskBoxNm = deptJobbxNm;
            return self();
        }
        public B indictOrdr(Integer indictOrdr) {
            this.sortOrdr = indictOrdr;
            return self();
        }
    }
}
