package nuri.business.domain.schedule;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

@Entity
@Table(name = "TB_SCHDUL_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Schedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "SCHDUL_ID", length = 20)
    private String schdlId;

    @Column(name = "SCHDUL_SE", length = 1)
    private String schdlSeCd;

    @Column(name = "SCHDUL_TTL", length = 255, nullable = false)
    private String schdlTtl;

    @Column(name = "SCHDUL_CN", columnDefinition = "TEXT")
    private String schdlCn;

    @Column(name = "REPT_ITV_VAL", length = 1)
    private String reptitSeCd;

    @Column(name = "SCHDUL_BGNG_YMD", length = 20)
    private String schdlBgngYmd;

    @Column(name = "SCHDUL_END_YMD", length = 20)
    private String schdlEndYmd;

    @Column(name = "SCHDUL_IPADDR", length = 20)
    private String schdlIpAddr;

    @Column(name = "SCHDUL_CHARGER_ID", length = 20)
    private String schdlPicId;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;
    
    // Additional fields used in service
    @Column(name = "SCHDUL_DEPT_ID", length = 20)
    private String schdlDeptId;
    @Column(name = "SCHDUL_KND_CD", length = 20)
    private String schdlKindCd;
    @Column(name = "SCHDUL_PLC_NM", length = 255)
    private String schdlPlcNm;
    @Column(name = "SCHDUL_IPCR_CD", length = 20)
    private String schdlIpcrCd;

    public void update(String schdlTtl, String schdlCn, String schdlSeCd, String schdlBgngYmd, String schdlEndYmd,
                       String reptitSeCd, String schdlPicId, String atchFileId) {
        this.schdlTtl = schdlTtl;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.reptitSeCd = reptitSeCd;
        this.schdlPicId = schdlPicId;
        this.atchFileId = atchFileId;
    }
    
    public void updateAll(String schdlTtl, String schdlCn, String schdlSeCd, String schdlKindCd, String schdlBgngYmd, String schdlEndYmd,
                       String schdlPlcNm, String schdlIpcrCd, String schdlPicId, String reptitSeCd) {
        this.schdlTtl = schdlTtl;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlKindCd = schdlKindCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.schdlPlcNm = schdlPlcNm;
        this.schdlIpcrCd = schdlIpcrCd;
        this.schdlPicId = schdlPicId;
        this.reptitSeCd = reptitSeCd;
    }

    // legacy aliases
    public String getSchdulId() { return schdlId; }
    public String getSchdulNm() { return schdlTtl; }
    public String getSchdulCn() { return schdlCn; }
    public String getSchdulBgnde() { return schdlBgngYmd; }
    public String getSchdulEndde() { return schdlEndYmd; }
}
