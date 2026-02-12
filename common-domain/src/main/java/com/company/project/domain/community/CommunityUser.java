package com.company.project.domain.community;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "COMTNCMMNTYUSER")
public class CommunityUser implements Serializable {

    @EmbeddedId
    private CommunityUserId id;

    @Column(name = "MNGR_AT", length = 1)
    private String mngrAt;

    @Column(name = "SBSCRB_DE")
    private LocalDateTime sbscrbDe;

    @Column(name = "SECSN_DE")
    private LocalDateTime secsnDe;

    @Column(name = "MBER_STTUS", length = 15)
    private String mberSttus;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public CommunityUser(CommunityUserId id, String mngrAt, LocalDateTime sbscrbDe, String mberSttus, String useAt,
            String frstRegisterId) {
        this.id = id;
        this.mngrAt = mngrAt;
        this.sbscrbDe = sbscrbDe;
        this.mberSttus = mberSttus;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
    }

    public void approve(String lastUpdusrId) {
        this.mberSttus = "P"; // Example status for approved
        this.lastUpdusrId = lastUpdusrId;
    }

    public void withdraw(String lastUpdusrId) {
        this.useAt = "N";
        this.secsnDe = LocalDateTime.now();
        this.mngrAt = "N";
        this.lastUpdusrId = lastUpdusrId;
    }

    public void grantAdmin(String lastUpdusrId) {
        this.mngrAt = "Y";
        this.lastUpdusrId = lastUpdusrId;
    }

    public void revokeAdmin(String lastUpdusrId) {
        this.mngrAt = "N";
        this.lastUpdusrId = lastUpdusrId;
    }
}
