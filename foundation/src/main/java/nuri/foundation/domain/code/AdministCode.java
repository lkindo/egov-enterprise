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
    @Column(name = "admdst_cd", length = 10)
    private String administZoneCode;

    @Column(name = "admdst_se", length = 1)
    private String administZoneSe;

    @Column(name = "administ_zone_nm", length = 60)
    private String administZoneNm;

    @Column(name = "up_admdst_cd", length = 10)
    private String upperAdministZoneCode;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    @Column(name = "crt_ymd", length = 8)
    private String creatDe;

    @Column(name = "abl_ymd", length = 8)
    private String ablDe;

    public void update(String administZoneSe, String administZoneNm, String upperAdministZoneCode, 
                       String useYn, String lastModifiedBy) {
        this.administZoneSe = administZoneSe;
        this.administZoneNm = administZoneNm;
        this.upperAdministZoneCode = upperAdministZoneCode;
        this.useYn = useYn;
        this.lastModifiedBy = lastModifiedBy;
    }
}
