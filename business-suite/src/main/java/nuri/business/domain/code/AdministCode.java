package nuri.business.domain.code;

import nuri.business.domain.common.BaseEntity;
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

    public void update(String admdstSeCd, String admdstZoneNm, String upAdmdstCd, 
                       String useYn, String lastMdfrId) {
        this.admdstSeCd = admdstSeCd;
        this.admdstZoneNm = admdstZoneNm;
        this.upAdmdstCd = upAdmdstCd;
        this.useYn = useYn;
        this.lastMdfrId = lastMdfrId;
    }
}
