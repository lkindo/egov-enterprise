package com.company.project.domain.community;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NCMMNTY")
@EntityListeners(AuditingEntityListener.class)
public class Community implements Serializable {

    @Id
    @Column(name = "CMMNTY_ID", length = 20)
    private String id;

    @Column(name = "CMMNTY_NM", length = 255)
    private String cmmntyNm;

    @Column(name = "CMMNTY_INTRCN", length = 2400)
    private String cmmntyIntrcn;

    @Column(name = "REGIST_SE_CODE", length = 6)
    private String registSeCode; // REGC01: Registration, REGC02: ...

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime modifiedDate;

    // Additional fields mapped in legacy but might be logic-based or joined
    // emplyrId is likely the owner/creator, which matches frstRegisterId usually.

    @Builder
    public Community(String id, String cmmntyNm, String cmmntyIntrcn, String registSeCode,
            String tmplatId, String useAt, String frstRegisterId) {
        this.id = id;
        this.cmmntyNm = cmmntyNm;
        this.cmmntyIntrcn = cmmntyIntrcn;
        this.registSeCode = registSeCode;
        this.tmplatId = tmplatId;
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String cmmntyNm, String cmmntyIntrcn, String tmplatId, String lastUpdusrId) {
        this.cmmntyNm = cmmntyNm;
        this.cmmntyIntrcn = cmmntyIntrcn;
        this.tmplatId = tmplatId;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void delete(String lastUpdusrId) {
        this.useAt = "N";
        this.lastUpdusrId = lastUpdusrId;
    }
}
