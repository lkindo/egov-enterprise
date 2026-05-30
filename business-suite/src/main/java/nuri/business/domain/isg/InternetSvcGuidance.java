package nuri.business.domain.isg;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_intrn_svc")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class InternetSvcGuidance extends BaseEntity {

    @Id
    @Column(name = "itnt_svc_id", length = 20)
    private String itntSvcId;

    @Column(length = 100)
    private String itntSvcNm;

    @Column(length = 4000)
    private String itntSvcExpln;

    @Column(length = 1)
    private String rfltYn;

    public void update(String itntSvcNm, String itntSvcExpln, String rfltYn) {
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
        this.rfltYn = rfltYn;
    }

    // ----- [Legacy Aliases for Backward Compatibility] -----

    public String getIntnetSvcId() {
        return itntSvcId;
    }

    public void setIntnetSvcId(String intnetSvcId) {
        this.itntSvcId = intnetSvcId;
    }

    public String getIntnetSvcNm() {
        return itntSvcNm;
    }

    public void setIntnetSvcNm(String intnetSvcNm) {
        this.itntSvcNm = intnetSvcNm;
    }

    public String getIntnetSvcDc() {
        return itntSvcExpln;
    }

    public void setIntnetSvcDc(String intnetSvcDc) {
        this.itntSvcExpln = intnetSvcDc;
    }

    public String getReflctAt() {
        return rfltYn;
    }

    public void setReflctAt(String reflctAt) {
        this.rfltYn = reflctAt;
    }
}
