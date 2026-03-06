package com.company.project.domain.schedule;

import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NSCHDULINFO")
@EntityListeners(AuditingEntityListener.class)
public class Schedule implements Serializable {

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String schdulId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String schdulSe; // 1: ???벥, 2: ?紐??? 3: 揶쏅벡????

    @Column(name = "SCHDUL_DEPT_ID", length = 20)
    private String schdulDeptId;

    @Column(name = "SCHDUL_KND_CODE", length = 1)
    private String schdulKindCode; // 1: ?봔??뽰뵬?? 2: 揶쏆뮇???깆젟

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String schdulBgnde; // ?얜챷??????袁⑸뮞??遊?(YYYYMMDDHHMM)

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String schdulEndde; // ?얜챷??????袁⑸뮞??遊?(YYYYMMDDHHMM)

    @Column(name = "SCHDUL_NM", length = 255)
    private String schdulNm;

    @Column(name = "SCHDUL_CN", columnDefinition = "TEXT")
    private String schdulCn;

    @Column(name = "SCHDUL_PLACE", length = 255)
    private String schdulPlace;

    @Column(name = "SCHDUL_IPCR_CODE", length = 1)
    private String schdulIpcrCode; // 餓λ쵐???(A,B,C)

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String schdulChargerId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "REPTIT_SE_CODE", length = 1)
    private String reptitSeCode; // 1:?諭?? 2:獄쏆꼶?? 3:?怨쀫꺗

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

    @Builder
    public Schedule(String schdulId, String schdulSe, String schdulDeptId, String schdulKindCode,
            String schdulBgnde, String schdulEndde, String schdulNm, String schdulCn,
            String schdulPlace, String schdulIpcrCode, String schdulChargerId,
            String atchFileId, String reptitSeCode, String frstRegisterId) {
        this.schdulId = schdulId;
        this.schdulSe = schdulSe;
        this.schdulDeptId = schdulDeptId;
        this.schdulKindCode = schdulKindCode;
        this.schdulBgnde = schdulBgnde;
        this.schdulEndde = schdulEndde;
        this.schdulNm = schdulNm;
        this.schdulCn = schdulCn;
        this.schdulPlace = schdulPlace;
        this.schdulIpcrCode = schdulIpcrCode;
        this.schdulChargerId = schdulChargerId;
        this.atchFileId = atchFileId;
        this.reptitSeCode = reptitSeCode;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String schdulSe, String schdulKindCode, String schdulBgnde, String schdulEndde,
            String schdulNm, String schdulCn, String schdulPlace, String schdulIpcrCode,
            String atchFileId, String reptitSeCode, String lastUpdusrId) {
        this.schdulSe = schdulSe;
        this.schdulKindCode = schdulKindCode;
        this.schdulBgnde = schdulBgnde;
        this.schdulEndde = schdulEndde;
        this.schdulNm = schdulNm;
        this.schdulCn = schdulCn;
        this.schdulPlace = schdulPlace;
        this.schdulIpcrCode = schdulIpcrCode;
        this.atchFileId = atchFileId;
        this.reptitSeCode = reptitSeCode;
        this.lastUpdusrId = lastUpdusrId;
    }
}
