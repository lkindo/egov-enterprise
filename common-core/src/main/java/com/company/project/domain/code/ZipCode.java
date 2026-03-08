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
@Table(name = "CZIP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ZipCode {

    @EmbeddedId
    private ZipCodeId id;

    @Column(name = "CTPRVN_NM", length = 60)
    private String ctprvnNm;

    @Column(name = "SIGNGU_NM", length = 60)
    private String signguNm;

    @Column(name = "EMD_NM", length = 60)
    private String emdNm;

    @Column(name = "LI_BULD_NM", length = 180)
    private String liBuldNm;

    @Column(name = "LNBR_DONG_HO", length = 60)
    private String lnbrDongHo;

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
    public static class ZipCodeId implements Serializable {
        @Column(name = "ZIP", length = 6)
        private String zip;

        @Column(name = "SN")
        private Long sn;

        @Builder
        public ZipCodeId(String zip, Long sn) {
            this.zip = zip;
            this.sn = sn;
        }
    }

    @Builder
    public ZipCode(ZipCodeId id, String ctprvnNm, String signguNm, String emdNm, String liBuldNm, String lnbrDongHo,
            String frstRegisterId) {
        this.id = id;
        this.ctprvnNm = ctprvnNm;
        this.signguNm = signguNm;
        this.emdNm = emdNm;
        this.liBuldNm = liBuldNm;
        this.lnbrDongHo = lnbrDongHo;
        this.frstRegisterId = frstRegisterId;
        this.lastUpdusrId = frstRegisterId;
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    public void update(String ctprvnNm, String signguNm, String emdNm, String liBuldNm, String lnbrDongHo,
            String lastUpdusrId) {
        this.ctprvnNm = ctprvnNm;
        this.signguNm = signguNm;
        this.emdNm = emdNm;
        this.liBuldNm = liBuldNm;
        this.lnbrDongHo = lnbrDongHo;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
