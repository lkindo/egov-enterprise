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
@Table(name = "NBNDTDIARY")
@IdClass(BndtDiaryId.class)
public class BndtDiary {

    @Id
    @Column(name = "BNDT_ID", length = 20)
    private String bndtId;

    @Id
    @Column(name = "BNDT_DE", length = 8)
    private String bndtDe;

    @Id
    @Column(name = "BNDT_CECK_SE", length = 2)
    private String bndtCeckSe;

    @Id
    @Column(name = "BNDT_CECK_CODE", length = 10)
    private String bndtCeckCd;

    @Column(name = "CHCK_STTUS", length = 1)
    private String chckSttus;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public BndtDiary(String bndtId, String bndtDe, String bndtCeckSe, String bndtCeckCd, String chckSttus,
            String frstRegisterId) {
        this.bndtId = bndtId;
        this.bndtDe = bndtDe;
        this.bndtCeckSe = bndtCeckSe;
        this.bndtCeckCd = bndtCeckCd;
        this.chckSttus = chckSttus;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String chckSttus, String lastUpdusrId) {
        this.chckSttus = chckSttus;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
