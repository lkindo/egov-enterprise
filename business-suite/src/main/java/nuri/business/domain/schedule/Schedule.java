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
    @Column(name = "SCHDL_ID", length = 20)
    private String schdlId;

    @Column(name = "SCHDL_SE_CD", length = 1)
    private String schdlSeCd; // 1: 부서, 2: 개인, 3: 메인화면

    @Column(name = "SCHDL_DEPT_ID", length = 20)
    private String schdlDeptId;

    @Column(name = "SCHDL_KND_CD", length = 1)
    private String schdlKindCd; // 1: 중요일정, 2: 일반일정

    @Column(name = "SCHDL_BGNG_YMD", length = 20)
    private String schdlBgngYmd; // 날짜형식(YYYYMMDDHHMM)

    @Column(name = "SCHDL_END_YMD", length = 20)
    private String schdlEndYmd; // 날짜형식(YYYYMMDDHHMM)

    @Column(name = "SCHDL_NM", length = 255)
    private String schdlTtl;

    @Column(name = "SCHDL_CN", columnDefinition = "TEXT")
    private String schdlCn;

    @Column(name = "SCHDL_PLC_NM", length = 255)
    private String schdlPlcNm;

    @Column(name = "SCHDL_IMPRT_CD", length = 1)
    private String schdlIpcrCd; // 중요도(A,B,C)

    @Column(name = "SCHDL_PIC_ID", length = 20)
    private String schdlPicId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "REPT_SE_CD", length = 1)
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
