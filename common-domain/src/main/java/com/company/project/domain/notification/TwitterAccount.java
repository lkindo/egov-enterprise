package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NTWITTER")
public class TwitterAccount {

    @Id
    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "CNSMR_KEY", length = 255)
    private String cnsmrKey;

    @Column(name = "CNSMR_SECRET", length = 255)
    private String cnsmrSecret;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public TwitterAccount(String userId, String cnsmrKey, String cnsmrSecret, String frstRegisterId) {
        this.userId = userId;
        this.cnsmrKey = cnsmrKey;
        this.cnsmrSecret = cnsmrSecret;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String cnsmrKey, String cnsmrSecret, String lastUpdusrId) {
        this.cnsmrKey = cnsmrKey;
        this.cnsmrSecret = cnsmrSecret;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
