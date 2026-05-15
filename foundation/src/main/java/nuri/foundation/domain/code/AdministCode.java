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
@Table(name = "TB_ADMIN_DISTRICT_CODE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class AdministCode extends BaseEntity {

    @Id
    @Column(name = "ADMDST_CD", length = 10)
    private String administZoneCode;

    @Column(name = "ADMDST_SE", length = 1)
    private String administZoneSe;

    @Column(name = "ADMINIST_ZONE_NM", length = 60)
    private String administZoneNm;

    @Column(name = "UP_ADMDST_CD", length = 10)
    private String upperAdministZoneCode;

    @Column(name = "USE_YN", length = 1)
    private String useYn;

    @Column(name = "CREAT_YMD", length = 8)
    private String creatDe;

    @Column(name = "ABL_YMD", length = 8)
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
