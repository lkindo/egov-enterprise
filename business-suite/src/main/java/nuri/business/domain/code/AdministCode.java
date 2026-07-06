package nuri.business.domain.code;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tb_admdst_cd")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdministCode extends BaseEntity {

    @Id
    @Column(length = 12)
    private String admdstCd;

    @Column(length = 12)
    private String admdstSeCd;

    @Column(length = 100)
    private String admdstZoneNm;

    @Column(length = 12)
    private String upAdmdstCd;

    @Column(length = 1)
    private String useYn;

    @Column(length = 8)
    private String crtYmd;

    @Column(length = 8)
    private String ablYmd;

    private AdministCode(String admdstCd, String admdstSeCd, String admdstZoneNm, String upAdmdstCd,
                         String useYn, String crtYmd, String ablYmd) {
        this.admdstCd = admdstCd;
        this.admdstSeCd = admdstSeCd;
        this.admdstZoneNm = admdstZoneNm;
        this.upAdmdstCd = upAdmdstCd;
        this.useYn = useYn;
        this.crtYmd = crtYmd;
        this.ablYmd = ablYmd;
    }

    @Builder
    public static AdministCode create(String admdstCd, String admdstSeCd, String admdstZoneNm, String upAdmdstCd,
                                      String useYn, String crtYmd, String ablYmd) {
        return new AdministCode(admdstCd, admdstSeCd, admdstZoneNm, upAdmdstCd, useYn, crtYmd, ablYmd);
    }

    public void update(String admdstSeCd, String admdstZoneNm, String upAdmdstCd, 
                       String useYn, String lastMdfrId) {
        this.admdstSeCd = admdstSeCd;
        this.admdstZoneNm = admdstZoneNm;
        this.upAdmdstCd = upAdmdstCd;
        this.useYn = useYn;
        this.lastMdfrId = lastMdfrId;
    }
}
