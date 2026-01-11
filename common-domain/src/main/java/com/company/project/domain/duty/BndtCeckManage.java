package com.company.project.domain.duty;

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
@Table(name = "NBNDTCECKMANAGE")
@IdClass(BndtCeckManageId.class)
public class BndtCeckManage {

    @Id
    @Column(name = "BNDT_CECK_SE", length = 2)
    private String bndtCeckSe;

    @Id
    @Column(name = "BNDT_CECK_CODE", length = 10)
    private String bndtCeckCd;

    @Column(name = "BNDT_CECK_CODE_NM", length = 255)
    private String bndtCeckCdNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public BndtCeckManage(String bndtCeckSe, String bndtCeckCd, String bndtCeckCdNm, String useAt,
            String frstRegisterId) {
        this.bndtCeckSe = bndtCeckSe;
        this.bndtCeckCd = bndtCeckCd;
        this.bndtCeckCdNm = bndtCeckCdNm;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String bndtCeckCdNm, String useAt, String lastUpdusrId) {
        this.bndtCeckCdNm = bndtCeckCdNm;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
