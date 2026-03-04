package com.company.project.domain.tir;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity
@Table(name = "NTWITTER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class Twitter {

    @Id
    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "CNSMR_KEY", length = 255)
    private String cnsmrKey;

    @Column(name = "CNSMR_SECRET", length = 255)
    private String cnsmrSecret;

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
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}