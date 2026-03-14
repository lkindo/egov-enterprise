package com.company.project.domain.deptjob;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * ?봔??뽯씜?얜똾釉??酉???
 *
 * @see NDEPTJOBBX ???뵠??筌띲끋釉?
 */
@Entity
@Table(name = "ndeptjobbx")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptJobBox extends BaseEntity {

    @Id
    @Column(name = "dept_jobbx_id", length = 20)
    private String deptJobbxId;

    @Column(name = "dept_jobbx_nm", length = 100)
    private String deptJobbxNm;

    @Column(name = "dept_id", length = 20)
    private String deptId;

    @Column(name = "indict_ordr")
    private Integer indictOrdr;

    public void update(String deptJobbxNm, String deptId, Integer indictOrdr) {
        this.deptJobbxNm = deptJobbxNm;
        this.deptId = deptId;
        this.indictOrdr = indictOrdr;
    }
}
