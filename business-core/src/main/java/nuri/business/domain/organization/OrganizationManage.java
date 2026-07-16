package nuri.business.domain.organization;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "tb_ognz_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationManage extends BaseEntity {

    @Id
    @Column(name = "ognz_id", length = 20)
    private String ognzId;

    // [V2_16] tb_ognz_info.ognz_nm SET NOT NULL 과 함께 이중 매핑(DeptManage)·물리 3자 계약 일치
    @Column(length = 100, nullable = false)
    private String ognzNm;

    @Column(length = 4000)
    private String ognzExpln;

    private OrganizationManage(String ognzId, String ognzNm, String ognzExpln) {
        this.ognzId = ognzId;
        this.ognzNm = ognzNm;
        this.ognzExpln = ognzExpln;
    }

    @Builder
    public static OrganizationManage create(String ognzId, String ognzNm, String ognzExpln) {
        return new OrganizationManage(ognzId, ognzNm, ognzExpln);
    }

}
