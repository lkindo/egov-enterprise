package com.company.project.domain.isg;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity
@Table(name = "NINTNETSVC")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class InternetSvcGuidance {

    @Id
    @Column(name = "INTNET_SVC_ID", length = 20)
    private String intnetSvcId;

    @Column(name = "INTNET_SVC_NM", length = 255)
    private String intnetSvcNm;

    @Column(name = "INTNET_SVC_DC", length = 1000)
    private String intnetSvcDc;

    @Column(name = "REFLCT_AT", length = 1)
    private String reflctAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @PrePersist
    protected void onCreate() {
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
        if (this.reflctAt == null)
            this.reflctAt = "N";
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
