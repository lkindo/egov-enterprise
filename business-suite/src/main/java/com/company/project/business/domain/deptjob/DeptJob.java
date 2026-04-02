package com.company.project.business.domain.deptjob;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "NDEPTJOB")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptJob extends BaseEntity {

    @Id
    @Column(name = "DEPT_JOB_ID", length = 20)
    private String deptJobId;

    @Column(name = "DEPT_JOBBX_ID", length = 20)
    private String deptJobbxId;

    @Column(name = "DEPT_JOB_NM", length = 255)
    private String deptJobNm;

    @Column(name = "DEPT_JOB_CN", columnDefinition = "TEXT")
    private String deptJobCn;

    @Column(name = "CHARGER_ID", length = 20)
    private String chargerId;

    @Column(name = "PRIORT", length = 1)
    private String priort; // 1: 誘れ벉, 2: 癰귣똾?? 3: ????

    @Column(name = "ATCH_FILE_ID", length = 20)
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
