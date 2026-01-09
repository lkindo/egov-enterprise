package com.company.project.domain.community;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NCMMNTYUSER")
@IdClass(CommunityUserId.class) // Composite Key
@EntityListeners(AuditingEntityListener.class)
public class CommunityUser implements Serializable {

    @Id
    @Column(name = "CMMNTY_ID", length = 20)
    private String cmmntyId;

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "MNGR_AT", length = 1)
    private String mngrAt; // Y: Manager, N: Member

    @Column(name = "MBER_STTUS", length = 15)
    private String mberSttus; // A: Approved, P: Pending, etc.

    @Column(name = "SBSCRB_DE")
    private LocalDateTime sbscrbDe; // Subscription Date

    @Column(name = "SECSN_DE")
    private String secsnDe; // Secession Date (Legacy is String?)

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime modifiedDate;

    @Builder
    public CommunityUser(String cmmntyId, String emplyrId, String mngrAt, String mberSttus,
            String useAt, String frstRegisterId) {
        this.cmmntyId = cmmntyId;
        this.emplyrId = emplyrId;
        this.mngrAt = mngrAt == null ? "N" : mngrAt;
        this.mberSttus = mberSttus == null ? "P" : mberSttus; // Default Pending
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
        this.sbscrbDe = LocalDateTime.now();
    }

    public void approve() {
        this.mberSttus = "A";
    }

    public void promoteToManager() {
        this.mngrAt = "Y";
    }

    public void demoteFromManager() {
        this.mngrAt = "N";
    }

    public void leave(String lastUpdusrId) { // 탈퇴
        this.useAt = "N";
        this.mberSttus = "D"; // Deleted/Seceded
        this.lastUpdusrId = lastUpdusrId;
        this.modifiedDate = LocalDateTime.now();
    }
}
