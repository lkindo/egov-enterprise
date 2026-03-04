package com.company.project.domain.zip;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ?怨좊젶甕곕뜇???酉???
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NCZIP", schema = "ebt")
@IdClass(ZipId.class)
public class Zip {

    @Id
    @Column(name = "ZIP", length = 6)
    private String zip;

    @Id
    @Column(name = "SN")
    private Integer sn;

    @Column(name = "CTPRVN_NM", length = 20)
    private String ctprvnNm;

    @Column(name = "SIGNGU_NM", length = 20)
    private String signguNm;

    @Column(name = "EMD_NM", length = 30)
    private String emdNm;

    @Column(name = "LI_BULD_NM", length = 60)
    private String liBuldNm;

    @Column(name = "LNBR_DONG_HO", length = 20)
    private String lnbrDongHo;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String ctprvnNm, String signguNm, String emdNm, String liBuldNm, String lnbrDongHo,
            String lastUpdusrId) {
        this.ctprvnNm = ctprvnNm;
        this.signguNm = signguNm;
        this.emdNm = emdNm;
        this.liBuldNm = liBuldNm;
        this.lnbrDongHo = lnbrDongHo;
        this.lastUpdusrId = lastUpdusrId;
    }
}
