package com.company.project.domain.isg;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "NINTNETSVC")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class InternetSvcGuidance extends BaseEntity {

    @Id
    @Column(name = "INTNET_SVC_ID", length = 20)
    private String intnetSvcId;

    @Column(name = "INTNET_SVC_NM", length = 255)
    private String intnetSvcNm;

    @Column(name = "INTNET_SVC_DC", length = 1000)
    private String intnetSvcDc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    public void update(String intnetSvcNm, String intnetSvcDc, String reflctAt) {
        this.intnetSvcNm = intnetSvcNm;
        this.intnetSvcDc = intnetSvcDc;
        this.reflctAt = reflctAt;
    }
}
