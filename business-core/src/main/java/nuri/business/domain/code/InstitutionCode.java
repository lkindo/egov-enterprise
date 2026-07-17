package nuri.business.domain.code;
 
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
    @Column(length = 7)
    private String instCd;
 
    @Column(length = 100)
    private String allInstNm;
 
    @Column(length = 100)
    private String lwstInstNm;
 
    @Column(length = 100)
    private String instAbbrNm;
 
    @Column(length = 2)
    private String odr;
 
    @Column(length = 3)
    private String ord;
 
    // 기관차수 — SSOT 도메인 수N2(NUMERIC(2), V2_19 전환). API 계약(String)은 서비스 경계에서 변환.
    @Column(columnDefinition = "numeric(2)")
    private Integer instCycl;
 
    @Column(length = 7)
    private String topInstCd;
 
    @Column(length = 7)
    private String uprInstCd;
 
    @Column(length = 7)
    private String reprsInstCd;
 
    @Column(length = 2)
    private String instTypeLclsf;
 
    @Column(length = 2)
    private String instTypeMclsf;
 
    @Column(length = 2)
    private String instTypeSclsf;
 
    @Column(length = 11)
    private String telno;
 
    @Column(length = 20)
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
 
    private Long sortOrdr;

    @Builder
    public InstitutionCode(String instCd, String allInstNm, String lwstInstNm, String instAbbrNm,
            String odr, String ord, Integer instCycl, String topInstCd,
            String uprInstCd, String reprsInstCd, String instTypeLclsf,
            String instTypeMclsf, String instTypeSclas, String telno, String faxNo,
            String crtYmd, String ablYmd, String ablYn, String chgYmd,
            String chgTm, String crtrYmd, Long sortOrdr, String frstRgtrId) {
        this.instCd = instCd;
        this.allInstNm = allInstNm;
        this.lwstInstNm = lwstInstNm;
        this.instAbbrNm = instAbbrNm;
        this.odr = odr;
        this.ord = ord;
        this.instCycl = instCycl;
        this.topInstCd = topInstCd;
        this.uprInstCd = uprInstCd;
        this.reprsInstCd = reprsInstCd;
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
        this.sortOrdr = sortOrdr;
        this.frstRgtrId = frstRgtrId;
    }
 
    public void update(String allInstNm, String lwstInstNm, String instAbbrNm, String odr, String ord,
            Integer instCycl, String topInstCd, String uprInstCd, String reprsInstCd,
            String instTypeLclsf, String instTypeMclsf, String instTypeSclsf, String telno,
            String faxNo, String crtYmd, String ablYmd, String ablYn, String chgYmd,
            String chgTm, String crtrYmd, Long sortOrdr, String lastMdfrId) {
        this.allInstNm = allInstNm;
        this.lwstInstNm = lwstInstNm;
        this.instAbbrNm = instAbbrNm;
        this.odr = odr;
        this.ord = ord;
        this.instCycl = instCycl;
        this.topInstCd = topInstCd;
        this.uprInstCd = uprInstCd;
        this.reprsInstCd = reprsInstCd;
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
        this.sortOrdr = sortOrdr;
        this.lastMdfrId = lastMdfrId;
    }
 
    public void softDelete(String ablYmd, String chgYmd, String chgTm) {
        this.ablYn = "1";
        this.ablYmd = ablYmd;
        this.chgYmd = chgYmd;
        this.chgTm = chgTm;
    }
}
