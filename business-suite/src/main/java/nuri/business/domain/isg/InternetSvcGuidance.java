package nuri.business.domain.isg;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_intrn_svc")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicInsert
@DynamicUpdate
public class InternetSvcGuidance extends BaseEntity {

    @Id
    @Column(length = 20)
    private String itntSvcId;

    @Column(length = 100)
    private String itntSvcNm;

    @Column(length = 4000)
    private String itntSvcExpln;

    @Column(length = 1)
    private String rfltYn;

    private InternetSvcGuidance(String itntSvcId, String itntSvcNm, String itntSvcExpln, String rfltYn) {
        this.itntSvcId = itntSvcId;
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
        this.rfltYn = rfltYn;
    }

    @Builder
    public static InternetSvcGuidance create(String itntSvcId, String itntSvcNm, String itntSvcExpln, String rfltYn) {
        return new InternetSvcGuidance(itntSvcId, itntSvcNm, itntSvcExpln, rfltYn);
    }

    public void update(String itntSvcNm, String itntSvcExpln, String rfltYn) {
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
        this.rfltYn = rfltYn;
    }

}
