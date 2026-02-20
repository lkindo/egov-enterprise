package com.company.project.domain.dam;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 筌왖??뱀읈?얜㈇? JPA Entity
 * ??뉕탢?????뵠?? NDAMPRO
 */
@Entity
@Table(name = "NDAMPRO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ProfessionalId.class)
public class Professional {

    @Id
    @Column(name = "EXPERT_ID", length = 20)
    private String speId;

    @Id
    @Column(name = "KNWLDG_TY_CODE", length = 20)
    private String knoTypeCd;

    @Id
    @Column(name = "EXPERT_GRAD", length = 1)
    private String appTypeCd;

    @Column(name = "EXPERT_DC", length = 2000)
    private String speExpCn;

    @Column(name = "EXPERT_CONFM_DE", length = 20)
    private String speConfmDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Professional(String speId, String knoTypeCd, String appTypeCd, String speExpCn,
            String speConfmDe, String frstRegisterId, String lastUpdusrId) {
        this.speId = speId;
        this.knoTypeCd = knoTypeCd;
        this.appTypeCd = appTypeCd;
        this.speExpCn = speExpCn;
        this.speConfmDe = speConfmDe;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
