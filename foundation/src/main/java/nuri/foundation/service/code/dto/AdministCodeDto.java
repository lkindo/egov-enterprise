package nuri.foundation.service.code.dto;
 
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
 
import java.time.LocalDateTime;
 
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdministCodeDto {
    @JsonProperty("administZoneCode")
    private String admdstCd;

    @JsonProperty("administZoneSe")
    private String admdstSeCd;

    @JsonProperty("administZoneNm")
    private String admdstZoneNm;

    @JsonProperty("upperAdministZoneCode")
    private String upAdmdstCd;

    private String useYn;

    @JsonProperty("creatDe")
    private String crtYmd;

    @JsonProperty("ablDe")
    private String ablYmd;

    private String createdBy;
    private LocalDateTime createdDate;
    private String lastModifiedBy;
    private LocalDateTime lastModifiedDate;

    // Manual Getter/Setter for safety
    public String getAdmdstCd() {
        return admdstCd;
    }

    public void setAdmdstCd(String admdstCd) {
        this.admdstCd = admdstCd;
    }

    public String getAdmdstSeCd() {
        return admdstSeCd;
    }

    public void setAdmdstSeCd(String admdstSeCd) {
        this.admdstSeCd = admdstSeCd;
    }

    public String getAdmdstZoneNm() {
        return admdstZoneNm;
    }

    public void setAdmdstZoneNm(String admdstZoneNm) {
        this.admdstZoneNm = admdstZoneNm;
    }

    public String getUpAdmdstCd() {
        return upAdmdstCd;
    }

    public void setUpAdmdstCd(String upAdmdstCd) {
        this.upAdmdstCd = upAdmdstCd;
    }

    public String getCrtYmd() {
        return crtYmd;
    }

    public void setCrtYmd(String crtYmd) {
        this.crtYmd = crtYmd;
    }

    public String getAblYmd() {
        return ablYmd;
    }

    public void setAblYmd(String ablYmd) {
        this.ablYmd = ablYmd;
    }

    // Compatibility Getters/Setters for legacy java code references
    @JsonIgnore
    public String getAdministZoneCode() {
        return admdstCd;
    }

    @JsonIgnore
    public void setAdministZoneCode(String administZoneCode) {
        this.admdstCd = administZoneCode;
    }

    @JsonIgnore
    public String getAdministZoneSe() {
        return admdstSeCd;
    }

    @JsonIgnore
    public void setAdministZoneSe(String administZoneSe) {
        this.admdstSeCd = administZoneSe;
    }

    @JsonIgnore
    public String getAdministZoneNm() {
        return admdstZoneNm;
    }

    @JsonIgnore
    public void setAdministZoneNm(String administZoneNm) {
        this.admdstZoneNm = administZoneNm;
    }

    @JsonIgnore
    public String getUpperAdministZoneCode() {
        return upAdmdstCd;
    }

    @JsonIgnore
    public void setUpperAdministZoneCode(String upperAdministZoneCode) {
        this.upAdmdstCd = upperAdministZoneCode;
    }

    @JsonIgnore
    public String getCreatDe() {
        return crtYmd;
    }

    @JsonIgnore
    public void setCreatDe(String creatDe) {
        this.crtYmd = creatDe;
    }

    @JsonIgnore
    public String getAblDe() {
        return ablYmd;
    }

    @JsonIgnore
    public void setAblDe(String ablDe) {
        this.ablYmd = ablDe;
    }
}
