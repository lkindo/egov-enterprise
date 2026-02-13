package com.company.project.domain.backup;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(name = "NBACKUPOPERT")
public class BackupOpert extends BaseEntity {

    @Id
    @Column(name = "BACKUP_OPERT_ID", length = 20)
    private String backupOpertId;

    @OneToMany(mappedBy = "backupOpert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BackupSchdulDfk> executSchdulDfkSes = new ArrayList<>();

    @Column(name = "BACKUP_OPERT_NM", length = 60)
    private String backupOpertNm;

    @Column(name = "BACKUP_ORGINL_DRCTRY", length = 255)
    private String backupOrginlDrctry;

    @Column(name = "BACKUP_STRE_DRCTRY", length = 255)
    private String backupStreDrctry;

    @Column(name = "CMPRS_SE", length = 2)
    private String cmprsSe;

    @Column(name = "EXECUT_CYCLE", length = 2)
    private String executCycle;

    @Column(name = "EXECUT_SCHDUL_DE", length = 20)
    private String executSchdulDe;

    @Column(name = "EXECUT_SCHDUL_HOUR", length = 2)
    private String executSchdulHour;

    @Column(name = "EXECUT_SCHDUL_MNT", length = 2)
    private String executSchdulMnt;

    @Column(name = "EXECUT_SCHDUL_SECND", length = 2)
    private String executSchdulSecnd;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public BackupOpert(String backupOpertId, String backupOpertNm, String backupOrginlDrctry, String backupStreDrctry,
            String cmprsSe, String executCycle, String executSchdulDe, String executSchdulHour, String executSchdulMnt,
            String executSchdulSecnd, String useAt, String frstRegisterId) {
        this.backupOpertId = backupOpertId;
        this.backupOpertNm = backupOpertNm;
        this.backupOrginlDrctry = backupOrginlDrctry;
        this.backupStreDrctry = backupStreDrctry;
        this.cmprsSe = cmprsSe;
        this.executCycle = executCycle;
        this.executSchdulDe = executSchdulDe;
        this.executSchdulHour = executSchdulHour;
        this.executSchdulMnt = executSchdulMnt;
        this.executSchdulSecnd = executSchdulSecnd;
        this.useAt = useAt;
        this.setFrstRegisterId(frstRegisterId);
    }

    public void delete() {
        this.useAt = "N";
    }
    
    // Missing methods for compatibility
    public void setFrstRegisterId(String frstRegisterId) {
        this.setCreatedBy(frstRegisterId);
    }
    
    public String getFrstRegisterId() {
        return this.getCreatedBy();
    }
    
    public String getLastUpdtPnttm() {
        return this.getLastModifiedDate() != null ? this.getLastModifiedDate().toString() : null;
    }
    
    public String getFrstRegistPnttm() {
        return this.getCreatedDate() != null ? this.getCreatedDate().toString() : null;
    }
    
    public void setExecutCycle(String executCycle) {
        this.executCycle = executCycle;
    }
    
    public String getExecutCycle() {
        return this.executCycle;
    }
}
