package nuri.business.domain.schedule;

import nuri.business.domain.common.BaseEntity;
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

    @Column(length = 12)
    private String schdlSeCd;

    @Column(length = 100, nullable = false)
    private String schdlNm;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String schdlCn;

    @Column(length = 12)
    private String reptSeCd;

    @Column(length = 8)
    private String schdlBgngYmd;

    @Column(length = 8)
    private String schdlEndYmd;

    @Transient
    private String schdlIpAddr;

    @Column(length = 20)
    private String schdlPicId;

    @Column(length = 30)
    private String atchFileId;
    
    // Additional fields used in service
    @Column(length = 20)
    private String schdlDeptId;
    @Column(length = 12)
    private String schdlKndCd;
    @Column(length = 100)
    private String schdlPlcNm;
    @Column(length = 12)
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
}
