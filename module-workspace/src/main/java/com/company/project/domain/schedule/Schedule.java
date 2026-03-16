package com.company.project.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NSCHDULINFO")
@SuperBuilder
public class Schedule extends BaseEntity implements Serializable {

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String schdulId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String schdulSe; // 1: 부서, 2: 개인, 3: 메인화면

    @Column(name = "SCHDUL_DEPT_ID", length = 20)
    private String schdulDeptId;

    @Column(name = "SCHDUL_KND_CODE", length = 1)
    private String schdulKindCode; // 1: 중요일정, 2: 일반일정

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String schdulBgnde; // 날짜형식(YYYYMMDDHHMM)

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String schdulEndde; // 날짜형식(YYYYMMDDHHMM)

    @Column(name = "SCHDUL_NM", length = 255)
    private String schdulNm;

    @Column(name = "SCHDUL_CN", columnDefinition = "TEXT")
    private String schdulCn;

    @Column(name = "SCHDUL_PLACE", length = 255)
    private String schdulPlace;

    @Column(name = "SCHDUL_IPCR_CODE", length = 1)
    private String schdulIpcrCode; // 중요도(A,B,C)

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String schdulChargerId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "REPTIT_SE_CODE", length = 1)
    private String reptitSeCode; // 1:매일, 2:매주, 3:매달

    public void update(String schdulSe, String schdulKindCode, String schdulBgnde, String schdulEndde,
            String schdulNm, String schdulCn, String schdulPlace, String schdulIpcrCode,
            String atchFileId, String reptitSeCode) {
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
    }
}
