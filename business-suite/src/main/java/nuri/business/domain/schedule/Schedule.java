package nuri.business.domain.schedule;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

@Entity
@Table(name = "tb_schdl_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Schedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "schdl_id", length = 20)
    private String schdlId;

    @Column(name = "schdl_se_cd", length = 12)
    private String schdlSeCd;

    @Column(name = "schdl_nm", length = 100, nullable = false)
    private String schdlNm;

    @Column(name = "schdl_cn", columnDefinition = "TEXT", length = 4000)
    private String schdlCn;

    @Column(name = "rept_se_cd", length = 12)
    private String reptSeCd;

    @Column(name = "schdl_bgng_ymd", length = 8)
    private String schdlBgngYmd;

    @Column(name = "schdl_end_ymd", length = 8)
    private String schdlEndYmd;

    @Transient
    private String schdlIpAddr;

    @Column(name = "schdl_pic_id", length = 20)
    private String schdlPicId;

    @Column(name = "atch_file_id", length = 30)
    private String atchFileId;
    
    // Additional fields used in service
    @Column(name = "schdl_dept_id", length = 20)
    private String schdlDeptId;
    @Column(name = "schdl_knd_cd", length = 12)
    private String schdlKndCd;
    @Column(name = "schdl_plc_nm", length = 100)
    private String schdlPlcNm;
    @Column(name = "schdl_imprt_cd", length = 12)
    private String schdlImprtCd;

    public void update(String schdlNm, String schdlCn, String schdlSeCd, String schdlBgngYmd, String schdlEndYmd,
                       String reptSeCd, String schdlPicId, String atchFileId) {
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.reptSeCd = reptSeCd;
        this.schdlPicId = schdlPicId;
        this.atchFileId = atchFileId;
    }
    
    public void updateAll(String schdlNm, String schdlCn, String schdlSeCd, String schdlKndCd, String schdlBgngYmd, String schdlEndYmd,
                       String schdlPlcNm, String schdlImprtCd, String schdlPicId, String reptSeCd) {
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlKndCd = schdlKndCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.schdlPlcNm = schdlPlcNm;
        this.schdlImprtCd = schdlImprtCd;
        this.schdlPicId = schdlPicId;
        this.reptSeCd = reptSeCd;
    }

    // legacy aliases
    public String getSchdulId() { return schdlId; }
    public String getSchdulNm() { return schdlNm; }
    public String getSchdulCn() { return schdlCn; }
    public String getSchdulBgnde() { return schdlBgngYmd; }
    public String getSchdulEndde() { return schdlEndYmd; }
}
