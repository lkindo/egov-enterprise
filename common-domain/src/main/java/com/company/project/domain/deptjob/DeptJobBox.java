package com.company.project.domain.deptjob;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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
@Builder
public class DeptJobBox {

    @Id
    @Column(name = "dept_jobbx_id", length = 20)
    private String deptJobbxId;

    @Column(name = "dept_jobbx_nm", length = 100)
    private String deptJobbxNm;

    @Column(name = "dept_id", length = 20)
    private String deptId;

    @Column(name = "indict_ordr")
    private Integer indictOrdr;

    @Column(name = "frst_register_id", length = 20)
    private String frstRegisterId;

    @Column(name = "frst_regist_pnttm")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "last_updusr_id", length = 20)
    private String lastUpdusrId;

    @Column(name = "last_updt_pnttm")
    private LocalDateTime lastUpdtPnttm;
}
