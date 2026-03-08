package com.company.project.domain.code;

import java.io.Serializable;
import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "RDNMADRZIP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoadNameAddressZipCode {

    @EmbeddedId
    private RoadNameAddressZipId id;

    @Column(name = "CTPRVN_NM", length = 60)
    private String ctprvnNm;

    @Column(name = "SIGNGU_NM", length = 60)
    private String signguNm;

    @Column(name = "RDMN", length = 60)
    private String rdmn;

    @Column(name = "BDNBR_MNNM", length = 5)
    private String bdnbrMnnm;

    @Column(name = "BDNBR_SLNO", length = 5)
    private String bdnbrSlno;

    @Column(name = "BULD_NM", length = 60)
    private String buldNm;

    @Column(name = "DETAIL_BULD_NM", length = 60)
    private String detailBuldNm;

    @Column(name = "ZIP", length = 6)
    private String zip;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegistPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @EqualsAndHashCode
    public static class RoadNameAddressZipId implements Serializable {
        @Column(name = "RDMN_CODE", length = 12)
        private String rdmnCode;

        @Column(name = "SN")
        private Long sn;

        @Builder
        public RoadNameAddressZipId(String rdmnCode, Long sn) {
            this.rdmnCode = rdmnCode;
            this.sn = sn;
        }
    }

    @Builder
    public RoadNameAddressZipCode(RoadNameAddressZipId id, String ctprvnNm, String signguNm, String rdmn,
            String bdnbrMnnm, String bdnbrSlno, String buldNm, String detailBuldNm,
            String zip, String frstRegisterId) {
        this.id = id;
        this.ctprvnNm = ctprvnNm;
        this.signguNm = signguNm;
        this.rdmn = rdmn;
        this.bdnbrMnnm = bdnbrMnnm;
        this.bdnbrSlno = bdnbrSlno;
        this.buldNm = buldNm;
        this.detailBuldNm = detailBuldNm;
        this.zip = zip;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String ctprvnNm, String signguNm, String rdmn, String bdnbrMnnm, String bdnbrSlno,
            String buldNm, String detailBuldNm, String zip, String lastUpdusrId) {
        this.ctprvnNm = ctprvnNm;
        this.signguNm = signguNm;
        this.rdmn = rdmn;
        this.bdnbrMnnm = bdnbrMnnm;
        this.bdnbrSlno = bdnbrSlno;
        this.buldNm = buldNm;
        this.detailBuldNm = detailBuldNm;
        this.zip = zip;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
