package nuri.business.domain.isg;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "tb_intrn_svc")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicInsert
@DynamicUpdate
public class InternetSvcGuidance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long itntSrvcSn;

    @Column(length = 100)
    private String itntSvcNm;

    @Column(length = 4000)
    private String itntSvcExpln;

    @Column(length = 1)
    private String rfltYn;

    private InternetSvcGuidance(Long itntSrvcSn, String itntSvcNm, String itntSvcExpln, String rfltYn) {
        this.itntSrvcSn = itntSrvcSn;
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
        this.rfltYn = rfltYn;
    }

    @Builder
    public static InternetSvcGuidance create(Long itntSrvcSn, String itntSvcNm, String itntSvcExpln, String rfltYn) {
        return new InternetSvcGuidance(itntSrvcSn, itntSvcNm, itntSvcExpln, rfltYn);
    }

    public void update(String itntSvcNm, String itntSvcExpln, String rfltYn) {
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
        this.rfltYn = rfltYn;
    }

}
