package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "기관코드 수신 정보 DTO")
public class InstitutionCodeRecptnDto {

    @Schema(description = "발생일자")
    @Size(max = 8)
    private String ocrnYmd;

    @Schema(description = "기관코드")
    @Size(max = 20)
    private String instCd;

    @Schema(description = "작업일련번호")
    private Long jobSn;

    @Schema(description = "변경구분코드")
    @Size(max = 12)
    private String chgSeCd;

    @Schema(description = "처리구분")
    @Size(max = 1)
    private String procSe;

    @Schema(description = "기타코드")
    @Size(max = 20)
    private String etcCd;

    @Schema(description = "전체기관명")
    @Size(max = 100)
    private String allInstNm;

    @Schema(description = "최하위기관명")
    @Size(max = 100)
    private String lwtrkInstNm;

    @Schema(description = "기관약칭명")
    @Size(max = 100)
    private String instAbbrNm;

    @Schema(description = "차수")
    @Size(max = 2)
    private String odr;

    @Schema(description = "서열")
    @Size(max = 3)
    private String ord;

    @Schema(description = "기관차수")
    @Size(max = 2)
    private String instCycl;

    @Schema(description = "최상위기관코드")
    @Size(max = 20)
    private String topInstCd;

    @Schema(description = "상위기관코드")
    @Size(max = 20)
    private String upInstCd;

    @Schema(description = "대표기관코드")
    @Size(max = 20)
    private String rprsInstCd;

    @Schema(description = "기관유형대분류")
    @Size(max = 2)
    private String instTypeLclsf;

    @Schema(description = "기관유형중분류")
    @Size(max = 2)
    private String instTypeMclsf;

    @Schema(description = "기관유형소분류")
    @Size(max = 2)
    private String instTypeSclsf;

    @Schema(description = "전화번호")
    @Size(max = 20)
    private String telno;

    @Schema(description = "팩스번호")
    @Size(max = 11)
    private String faxNo;

    @Schema(description = "생성일자")
    @Size(max = 8)
    private String crtYmd;

    @Schema(description = "폐지일자")
    @Size(max = 8)
    private String ablYmd;

    @Schema(description = "폐지여부")
    @Size(max = 1)
    private String ablYn;

    @Schema(description = "변경일자")
    @Size(max = 8)
    private String chgYmd;

    @Schema(description = "변경시간")
    @Size(max = 20)
    private String chgTm;

    @Schema(description = "기준일자")
    @Size(max = 8)
    private String crtrYmd;

    @Schema(description = "정렬순서")
    private Integer sortSeq;

    @Schema(description = "최초등록일시")
    private LocalDateTime crtDt;

    @Schema(description = "최초등록자 ID")
    @Size(max = 20)
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
