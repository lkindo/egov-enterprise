package nuri.foundation.domain.isg;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
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
    private String intnetSvcId;

    @Column(name = "itnt_svc_nm", length = 255)
    private String intnetSvcNm;

    @Column(name = "itnt_svc_expln", length = 1000)
    private String intnetSvcDc;

    @Column(name = "rflt_yn", length = 1)
    private String reflctAt;

    public void update(String intnetSvcNm, String intnetSvcDc, String reflctAt) {
        this.intnetSvcNm = intnetSvcNm;
        this.intnetSvcDc = intnetSvcDc;
        this.reflctAt = reflctAt;
    }
}
