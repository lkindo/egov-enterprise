package com.company.project.domain.community;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "NCMMNTY")
public class Community implements Serializable {

    @Id
    @Column(name = "CMMNTY_ID", length = 20, nullable = false)
    private String cmmntyId;

    @Column(name = "CMMNTY_NM", length = 255)
    private String cmmntyNm;

    @Column(name = "CMMNTY_INTRCN", length = 2400)
    private String cmmntyIntrcn;

    @Column(name = "REGIST_SE_CODE", length = 6)
    private String registSeCode;

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public Community(String cmmntyId, String cmmntyNm, String cmmntyIntrcn, String registSeCode,
            String tmplatId, String useAt, String frstRegisterId) {
        this.cmmntyId = cmmntyId;
        this.cmmntyNm = cmmntyNm;
        this.cmmntyIntrcn = cmmntyIntrcn;
        this.registSeCode = registSeCode;
        this.tmplatId = tmplatId;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String cmmntyNm, String cmmntyIntrcn, String tmplatId, String useAt, String lastUpdusrId) {
        this.cmmntyNm = cmmntyNm;
        this.cmmntyIntrcn = cmmntyIntrcn;
        this.tmplatId = tmplatId;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void delete(String lastUpdusrId) {
        this.useAt = "N";
        this.lastUpdusrId = lastUpdusrId;
    }
}
