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
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "tb_admdst_cd")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")
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

    public void update(String admdstSeCd, String admdstZoneNm, String upAdmdstCd, 
                       String useYn, String lastMdfrId) {
        this.admdstSeCd = admdstSeCd;
        this.admdstZoneNm = admdstZoneNm;
        this.upAdmdstCd = upAdmdstCd;
        this.useYn = useYn;
        this.lastMdfrId = lastMdfrId;
    }

    /** 소프트 삭제. 물리 DELETE 는 @DisableSoftDelete 관리자 조회 설계를 깨고 자식(up_admdst_cd) 참조를 고아로 만든다. */
    public void delete() {
        this.useYn = "N";
    }
}
