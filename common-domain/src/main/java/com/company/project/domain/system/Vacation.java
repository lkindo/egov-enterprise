package com.company.project.domain.system;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "NVCATNMANAGE")
public class Vacation extends BaseEntity {

    @Id
    @Column(name = "APPLCNT_ID", length = 20)
    private String applcntId;

    @Id
    @Column(name = "VCATN_SE", length = 2)
    private String vcatnSe;

    @Id
    @Column(name = "BGNDE", length = 20)
    private String bgnde;

    @Column(name = "ENDDE", length = 20)
    private String endde;

    @Column(name = "REQST_DE", length = 20)
    private String reqstDe;

    @Column(name = "VCATN_RESN", length = 2500)
    private String vcatnResn;

    @Column(name = "OCCRRNC_YEAR", length = 4)
    private String occrrncYear;

    @Column(name = "NOON_SE", length = 1)
    private String noonSe;

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
