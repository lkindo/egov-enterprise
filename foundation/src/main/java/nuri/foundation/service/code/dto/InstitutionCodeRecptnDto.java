package nuri.foundation.service.code.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstitutionCodeRecptnDto {

    @JsonProperty("ocrnYmd")
    private String ocrnYmd;

    @JsonProperty("insttCode")
    private String instCd;

    @JsonProperty("opertSn")
    private Long jobSn;

    @JsonProperty("changeSeCode")
    private String chgSeCd;

    @JsonProperty("processSe")
    private String procSe;

    @JsonProperty("etcCode")
    private String etcCd;

    @JsonProperty("allInsttNm")
    private String allInstNm;

    @JsonProperty("lowestInsttNm")
    private String lwtrkInstNm;

    @JsonProperty("insttAbrvNm")
    private String instAbbrNm;

    @JsonProperty("odr")
    private String odr;

    @JsonProperty("ord")
    private String ord;

    @JsonProperty("insttOdr")
    private String instCycl;

    @JsonProperty("bestInsttCode")
    private String topInstCd;

    @JsonProperty("upperInsttCode")
    private String upInstCd;

    @JsonProperty("reprsntInsttCode")
    private String rprsInstCd;

    @JsonProperty("insttTyLclas")
    private String instTypeLclsf;

    @JsonProperty("insttTyMclas")
    private String instTypeMclsf;

    @JsonProperty("insttTySclas")
    private String instTypeSclsf;

    @JsonProperty("telno")
    private String telno;

    @JsonProperty("fxnum")
    private String faxNo;

    @JsonProperty("creatDe")
    private String crtYmd;

    @JsonProperty("ablDe")
    private String ablYmd;

    @JsonProperty("ablEnnc")
    private String ablYn;

    @JsonProperty("changede")
    private String chgYmd;

    @JsonProperty("changeTime")
    private String chgTm;

    @JsonProperty("bsisDe")
    private String crtrYmd;

    @JsonProperty("sortOrdr")
    private Integer sortSeq;

    @JsonProperty("frstRegisterPnttm")
    private LocalDateTime crtDt;

    @JsonProperty("frstRegisterId")
    private String frstRgtrId;

    // --- Legacy Compatibility Getters & Setters ---

    @JsonIgnore
    public String getInsttCode() {
        return this.instCd;
    }

    @JsonIgnore
    public void setInsttCode(String insttCode) {
        this.instCd = insttCode;
    }

    @JsonIgnore
    public Long getOpertSn() {
        return this.jobSn;
    }

    @JsonIgnore
    public void setOpertSn(Long opertSn) {
        this.jobSn = opertSn;
    }

    @JsonIgnore
    public String getChangeSeCode() {
        return this.chgSeCd;
    }

    @JsonIgnore
    public void setChangeSeCode(String changeSeCode) {
        this.chgSeCd = changeSeCode;
    }

    @JsonIgnore
    public String getProcessSe() {
        return this.procSe;
    }

    @JsonIgnore
    public void setProcessSe(String processSe) {
        this.procSe = processSe;
    }

    @JsonIgnore
    public String getEtcCode() {
        return this.etcCd;
    }

    @JsonIgnore
    public void setEtcCode(String etcCode) {
        this.etcCd = etcCode;
    }

    @JsonIgnore
    public String getAllInsttNm() {
        return this.allInstNm;
    }

    @JsonIgnore
    public void setAllInsttNm(String allInsttNm) {
        this.allInstNm = allInsttNm;
    }

    @JsonIgnore
    public String getLowestInsttNm() {
        return this.lwtrkInstNm;
    }

    @JsonIgnore
    public void setLowestInsttNm(String lowestInsttNm) {
        this.lwtrkInstNm = lowestInsttNm;
    }

    @JsonIgnore
    public String getInsttAbrvNm() {
        return this.instAbbrNm;
    }

    @JsonIgnore
    public void setInsttAbrvNm(String insttAbrvNm) {
        this.instAbbrNm = insttAbrvNm;
    }

    @JsonIgnore
    public String getInsttOdr() {
        return this.instCycl;
    }

    @JsonIgnore
    public void setInsttOdr(String insttOdr) {
        this.instCycl = insttOdr;
    }

    @JsonIgnore
    public String getBestInsttCode() {
        return this.topInstCd;
    }

    @JsonIgnore
    public void setBestInsttCode(String bestInsttCode) {
        this.topInstCd = bestInsttCode;
    }

    @JsonIgnore
    public String getUpperInsttCode() {
        return this.upInstCd;
    }

    @JsonIgnore
    public void setUpperInsttCode(String upperInsttCode) {
        this.upInstCd = upperInsttCode;
    }

    @JsonIgnore
    public String getReprsntInsttCode() {
        return this.rprsInstCd;
    }

    @JsonIgnore
    public void setReprsntInsttCode(String reprsntInsttCode) {
        this.rprsInstCd = reprsntInsttCode;
    }

    @JsonIgnore
    public String getInsttTyLclas() {
        return this.instTypeLclsf;
    }

    @JsonIgnore
    public void setInsttTyLclas(String insttTyLclas) {
        this.instTypeLclsf = insttTyLclas;
    }

    @JsonIgnore
    public String getInsttTyMclas() {
        return this.instTypeMclsf;
    }

    @JsonIgnore
    public void setInsttTyMclas(String insttTyMclas) {
        this.instTypeMclsf = insttTyMclas;
    }

    @JsonIgnore
    public String getInsttTySclas() {
        return this.instTypeSclsf;
    }

    @JsonIgnore
    public void setInsttTySclas(String insttTySclas) {
        this.instTypeSclsf = insttTySclas;
    }

    @JsonIgnore
    public String getFxnum() {
        return this.faxNo;
    }

    @JsonIgnore
    public void setFxnum(String fxnum) {
        this.faxNo = fxnum;
    }

    @JsonIgnore
    public String getCreatDe() {
        return this.crtYmd;
    }

    @JsonIgnore
    public void setCreatDe(String creatDe) {
        this.crtYmd = creatDe;
    }

    @JsonIgnore
    public String getAblDe() {
        return this.ablYmd;
    }

    @JsonIgnore
    public void setAblDe(String ablDe) {
        this.ablYmd = ablDe;
    }

    @JsonIgnore
    public String getAblEnnc() {
        return this.ablYn;
    }

    @JsonIgnore
    public void setAblEnnc(String ablEnnc) {
        this.ablYn = ablEnnc;
    }

    @JsonIgnore
    public String getChangede() {
        return this.chgYmd;
    }

    @JsonIgnore
    public void setChangede(String changede) {
        this.chgYmd = changede;
    }

    @JsonIgnore
    public String getChangeTime() {
        return this.chgTm;
    }

    @JsonIgnore
    public void setChangeTime(String changeTime) {
        this.chgTm = changeTime;
    }

    @JsonIgnore
    public String getBsisDe() {
        return this.crtrYmd;
    }

    @JsonIgnore
    public void setBsisDe(String bsisDe) {
        this.crtrYmd = bsisDe;
    }

    @JsonIgnore
    public Integer getSortOrdr() {
        return this.sortSeq;
    }

    @JsonIgnore
    public void setSortOrdr(Integer sortOrdr) {
        this.sortSeq = sortOrdr;
    }

    @JsonIgnore
    public LocalDateTime getFrstRegisterPnttm() {
        return this.crtDt;
    }

    @JsonIgnore
    public void setFrstRegisterPnttm(LocalDateTime frstRegisterPnttm) {
        this.crtDt = frstRegisterPnttm;
    }

    @JsonIgnore
    public String getFrstRegisterId() {
        return this.frstRgtrId;
    }

    @JsonIgnore
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRgtrId = frstRegisterId;
    }
}
