package nuri.foundation.service.code.dto;
 
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
@Schema(description = "행정코드 정보 DTO")
public class AdministCodeDto {
    @Schema(description = "행정구역코드")
    private String admdstCd;

    @Schema(description = "행정구역구분")
    private String admdstSeCd;

    @Schema(description = "행정구역명")
    private String admdstZoneNm;

    @Schema(description = "상위행정구역코드")
    private String upAdmdstCd;

    @Schema(description = "사용여부")
    private String useYn;

    @Schema(description = "생성일자")
    private String crtYmd;

    @Schema(description = "폐지일자")
    private String ablYmd;

    @Schema(description = "생성자 ID")
    private String createdBy;

    @Schema(description = "생성일시")
    private LocalDateTime createdDate;

    @Schema(description = "수정자 ID")
    private String lastModifiedBy;

    @Schema(description = "수정일시")
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
