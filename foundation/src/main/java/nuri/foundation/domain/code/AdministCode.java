package nuri.foundation.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "tb_admdst_cd")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class AdministCode extends BaseEntity {

    @Id
    @Column(name = "admdst_cd", length = 12)
    private String admdstCd;

    @Column(name = "admdst_se_cd", length = 12)
    private String admdstSeCd;

    @Column(name = "admdst_zone_nm", length = 100)
    private String admdstZoneNm;

    @Column(name = "up_admdst_cd", length = 12)
    private String upAdmdstCd;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    @Column(name = "crt_ymd", length = 8)
    private String crtYmd;

    @Column(name = "abl_ymd", length = 8)
    private String ablYmd;

    public void update(String admdstSeCd, String admdstZoneNm, String upAdmdstCd, 
                       String useYn, String lastModifiedBy) {
        this.admdstSeCd = admdstSeCd;
        this.admdstZoneNm = admdstZoneNm;
        this.upAdmdstCd = upAdmdstCd;
        this.useYn = useYn;
        this.lastModifiedBy = lastModifiedBy;
    }
}
