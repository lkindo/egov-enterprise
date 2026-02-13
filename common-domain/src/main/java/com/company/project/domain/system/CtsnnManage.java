package com.company.project.domain.system;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NCTSNNMANAGE")
public class CtsnnManage extends BaseEntity {

    @Id
    @Column(name = "CTSNN_ID", length = 20)
    private String ctsnnId;

    @Column(name = "USID", length = 20)
    private String usid;

    @Column(name = "CTSNN_CD", length = 3)
    private String ctsnnCd;

    @Column(name = "REQST_DE", length = 20)
    private String reqstDe;

    @Column(name = "CTSNN_NM", length = 255)
    private String ctsnnNm;

    @Column(name = "TRGTER_NM", length = 60)
    private String trgterNm;

    @Column(name = "BRTH", length = 20)
    private String brth;

    @Column(name = "OCCRR_DE", length = 20)
    private String occrrDe;

    @Column(name = "RELATE", length = 20)
    private String relate;

    @Column(name = "REMARK", length = 1000)
    private String remark;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private String sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;
}
