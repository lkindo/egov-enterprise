package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NINDVDLYRYCMANAGE")
@IdClass(IndvdlYrycManageId.class)
public class IndvdlYrycManage {

    @Id
    @Column(name = "OCCRRNC_YEAR", length = 4)
    private String occrrncYear;

    @Id
    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "YRYC_OCCRRNC_CO")
    private Double yrycOccrrncCo;

    @Column(name = "USE_YRYC_CO")
    private Double useYrycCo;

    @Column(name = "REMNDR_YRYC_CO")
    private Double remndrYrycCo;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public IndvdlYrycManage(String occrrncYear, String userId, Double yrycOccrrncCo, Double useYrycCo,
            Double remndrYrycCo, String frstRegisterId) {
        this.occrrncYear = occrrncYear;
        this.userId = userId;
        this.yrycOccrrncCo = yrycOccrrncCo;
        this.useYrycCo = useYrycCo;
        this.remndrYrycCo = remndrYrycCo;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(Double useYrycCo, Double remndrYrycCo, String lastUpdusrId) {
        this.useYrycCo = useYrycCo;
        this.remndrYrycCo = remndrYrycCo;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
