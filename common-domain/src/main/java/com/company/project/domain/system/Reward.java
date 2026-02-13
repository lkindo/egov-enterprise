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
@Table(name = "NRWARDMANAGE")
public class Reward extends BaseEntity {

    @Id
    @Column(name = "RWARD_ID", length = 20)
    private String rwardId;

    @Column(name = "RWARD_MAN_ID", length = 20)
    private String rwardManId;

    @Column(name = "RWARD_CD", length = 3)
    private String rwardCd;

    @Column(name = "RWARD_DE", length = 20)
    private String rwardDe;

    @Column(name = "RWARD_NM", length = 255)
    private String rwardNm;

    @Column(name = "PBLEN_CN", length = 2500)
    private String pblenCn;

    @Column(name = "SANCTNER_ID", length = 20)
    private String sanctnerId;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    @Column(name = "SANCTN_DT")
    private String sanctnDt;

    @Column(name = "RETURN_RESN", length = 1000)
    private String returnResn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "INFRML_SANCTN_ID", length = 20)
    private String infrmlSanctnId;
}
