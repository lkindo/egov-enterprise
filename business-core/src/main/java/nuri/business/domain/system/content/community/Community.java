package nuri.business.domain.system.content.community;

import nuri.foundation.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "tb_cmnty_info")
public class Community extends BaseEntity implements Serializable {

    @Id
    @Column(length = 20, nullable = false)
    private String cmntyId;

    @Column(length = 100)
    private String cmntyNm;

    @Column(length = 4000)
    private String cmntyIntroCn;

    @Column(length = 12)
    private String regSeCd;

    @Column(length = 20)
    private String tmpltId;

    @Column(length = 1)
    private String useYn;

    private Community(String cmntyId, String cmntyNm, String cmntyIntroCn, String regSeCd, String tmpltId, String useYn) {
        this.cmntyId = cmntyId;
        this.cmntyNm = cmntyNm;
        this.cmntyIntroCn = cmntyIntroCn;
        this.regSeCd = regSeCd;
        this.tmpltId = tmpltId;
        this.useYn = useYn;
    }

    @Builder
    public static Community create(String cmntyId, String cmntyNm, String cmntyIntroCn, String regSeCd, String tmpltId, String useYn) {
        return new Community(cmntyId, cmntyNm, cmntyIntroCn, regSeCd, tmpltId, useYn);
    }

    public void update(String cmntyNm, String cmntyIntroCn, String tmpltId, String useYn) {
        this.cmntyNm = cmntyNm;
        this.cmntyIntroCn = cmntyIntroCn;
        this.tmpltId = tmpltId;
        this.useYn = useYn;
    }

    public void delete() {
        this.useYn = "N";
    }
}
