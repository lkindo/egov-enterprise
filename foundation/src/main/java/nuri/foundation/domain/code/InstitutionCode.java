package nuri.foundation.domain.code;
 
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
 
@Entity
@Table(name = "tb_inst_cd")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstitutionCode extends BaseEntity {
 
    @Id
    @Column(name = "inst_cd", length = 20)
    private String instCd;
 
    @Column(length = 100)
    private String allInstNm;
 
    @Column(length = 100)
    private String lwtrkInstNm;
 
    @Column(length = 100)
    private String instAbbrNm;
 
    @Column(length = 2)
    private String odr;
 
    @Column(length = 3)
    private String ord;
 
    @Column(length = 12)
    private String instCycl;
 
    @Column(length = 20)
    private String topInstCd;
 
    @Column(length = 20)
    private String upInstCd;
 
    @Column(length = 20)
    private String rprsInstCd;
 
    @Column(length = 2)
    private String instTypeLclsf;
 
    @Column(length = 2)
    private String instTypeMclsf;
 
    @Column(length = 2)
    private String instTypeSclsf;
 
    @Column(length = 13)
    private String telno;
 
    @Column(length = 13)
    private String faxNo;
 
    @Column(length = 8)
    private String crtYmd;
 
    @Column(length = 8)
    private String ablYmd;
 
    @Column(length = 1)
    private String ablYn;
 
    @Column(length = 8)
    private String chgYmd;
 
    @Column(length = 20)
    private String chgTm;
 
    @Column(length = 8)
    private String crtrYmd;
 
    private Integer sortSeq;
 
    @Builder
    public InstitutionCode(String instCd, String allInstNm, String lwtrkInstNm, String instAbbrNm,
            String odr, String ord, String instCycl, String topInstCd,
            String upInstCd, String rprsInstCd, String instTypeLclsf,
            String instTypeMclsf, String instTypeSclas, String telno, String faxNo,
            String crtYmd, String ablYmd, String ablYn, String chgYmd,
            String chgTm, String crtrYmd, Integer sortSeq, String createdBy) {
        this.instCd = instCd;
        this.allInstNm = allInstNm;
        this.lwtrkInstNm = lwtrkInstNm;
        this.instAbbrNm = instAbbrNm;
        this.odr = odr;
        this.ord = ord;
        this.instCycl = instCycl;
        this.topInstCd = topInstCd;
        this.upInstCd = upInstCd;
        this.rprsInstCd = rprsInstCd;
        this.instTypeLclsf = instTypeLclsf;
        this.instTypeMclsf = instTypeMclsf;
        this.instTypeSclsf = instTypeSclas;
        this.telno = telno;
        this.faxNo = faxNo;
        this.crtYmd = crtYmd;
        this.ablYmd = ablYmd;
        this.ablYn = ablYn == null ? "0" : ablYn;
        this.chgYmd = chgYmd;
        this.chgTm = chgTm;
        this.crtrYmd = crtrYmd;
        this.sortSeq = sortSeq;
        this.createdBy = createdBy;
    }
 
    public void update(String allInstNm, String lwtrkInstNm, String instAbbrNm, String odr, String ord,
            String instCycl, String topInstCd, String upInstCd, String rprsInstCd,
            String instTypeLclsf, String instTypeMclsf, String instTypeSclsf, String telno,
            String faxNo, String crtYmd, String ablYmd, String ablYn, String chgYmd,
            String chgTm, String crtrYmd, Integer sortSeq, String lastModifiedBy) {
        this.allInstNm = allInstNm;
        this.lwtrkInstNm = lwtrkInstNm;
        this.instAbbrNm = instAbbrNm;
        this.odr = odr;
        this.ord = ord;
        this.instCycl = instCycl;
        this.topInstCd = topInstCd;
        this.upInstCd = upInstCd;
        this.rprsInstCd = rprsInstCd;
        this.instTypeLclsf = instTypeLclsf;
        this.instTypeMclsf = instTypeMclsf;
        this.instTypeSclsf = instTypeSclsf;
        this.telno = telno;
        this.faxNo = faxNo;
        this.crtYmd = crtYmd;
        this.ablYmd = ablYmd;
        this.ablYn = ablYn;
        this.chgYmd = chgYmd;
        this.chgTm = chgTm;
        this.crtrYmd = crtrYmd;
        this.sortSeq = sortSeq;
        this.lastModifiedBy = lastModifiedBy;
    }
 
    public void softDelete(String ablYmd, String chgYmd, String chgTm) {
        this.ablYn = "1";
        this.ablYmd = ablYmd;
        this.chgYmd = chgYmd;
        this.chgTm = chgTm;
    }
}
