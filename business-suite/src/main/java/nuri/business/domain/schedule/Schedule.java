package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
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
@Table(name = "TB_SCHDL_INFO")
@SuperBuilder
public class Schedule extends BaseEntity implements Serializable {

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String schdlId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String schdlSeCd; // 1: 부서, 2: 개인, 3: 메인화면

    @Column(name = "SCHDUL_DEPT_ID", length = 20)
    private String schdlDeptId;

    @Column(name = "SCHDUL_KND_CODE", length = 1)
    private String schdlKindCd; // 1: 중요일정, 2: 일반일정

    @Column(name = "SCHDUL_BGNDE", length = 20)
    private String schdlBgngYmd; // 날짜형식(YYYYMMDDHHMM)

    @Column(name = "SCHDUL_ENDDE", length = 20)
    private String schdlEndYmd; // 날짜형식(YYYYMMDDHHMM)

    @Column(name = "SCHDUL_NM", length = 255)
    private String schdlTtl;

    @Column(name = "SCHDUL_CN", columnDefinition = "TEXT")
    private String schdlCn;

    @Column(name = "SCHDUL_PLACE", length = 255)
    private String schdlPlcNm;

    @Column(name = "SCHDUL_IPCR_CODE", length = 1)
    private String schdlIpcrCd; // 중요도(A,B,C)

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String schdlPicId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "REPTIT_SE_CODE", length = 1)
    private String reptitSeCd; // 1:매일, 2:매주, 3:매달

    public void update(String schdlSeCd, String schdlKindCd, String schdlBgngYmd, String schdlEndYmd,
            String schdlTtl, String schdlCn, String schdlPlcNm, String schdlIpcrCd,
            String atchFileId, String reptitSeCd) {
        this.schdlSeCd = schdlSeCd;
        this.schdlKindCd = schdlKindCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.schdlTtl = schdlTtl;
        this.schdlCn = schdlCn;
        this.schdlPlcNm = schdlPlcNm;
        this.schdlIpcrCd = schdlIpcrCd;
        this.atchFileId = atchFileId;
        this.reptitSeCd = reptitSeCd;
    }
}
