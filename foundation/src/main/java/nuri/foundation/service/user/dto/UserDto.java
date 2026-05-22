package nuri.foundation.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;
import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;


/**
 * 사용자 관리 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    @NonNull
    @NotBlank(message = "사용자 ID 는 필수입니다")
    @Size(min = 4, max = 20, message = "사용자 ID 는 4-20 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "사용자 ID 는 영문, 숫자, 밑줄만 가능합니다")
    private String userId;

    @NonNull
    @NotBlank(message = "사용자명은 필수입니다")
    @Pattern(regexp = "^[a-zA-Z0-9가-힣\\s]{2,50}$", message = "사용자명은 2~50자의 영문, 숫자, 한글만 가능합니다")
    private String userNm;

    private String esntlId;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 8, max = 100, message = "비밀번호는 8-100 자입니다")
    @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$", message = "비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다")
    private String pswd;

    @Size(max = 300, message = "비밀번호 힌트는 최대 300 자입니다")
    private String pswdHint;

    @Size(max = 100, message = "비밀번호 정답은 최대 100 자입니다")
    private String pswdCrans;
    
    @Size(max = 50, message = "권한명은 최대 50 자입니다")
    private String role;

    @Size(max = 20, message = "사번은 최대 20 자입니다")
    private String emplNo;

    @Size(max = 12, message = "성별 코드는 최대 12 자입니다")
    private String gndrCd;

    @Size(max = 8, message = "생년월일은 8자입니다")
    private String brthYmd;

    @Size(max = 4, message = "지역번호는 최대 4 자입니다")
    private String areaNo;

    @JsonProperty("homemiddleTelno")
    @JsonAlias({"homemiddleTelno", "homeMiddleTelno"})
    @Size(max = 4, message = "전화번호 중간자리는 최대 4 자입니다")
    private String homeMiddleTelno;

    @JsonProperty("homeendTelno")
    @JsonAlias({"homeendTelno", "homeEndTelno"})
    @Size(max = 4, message = "전화번호 끝자리는 최대 4 자입니다")
    private String homeEndTelno;

    @JsonProperty("mberTyCode")
    @JsonAlias({"mberTyCode", "mberTypeCd"})
    @Size(max = 20, message = "회원 유형 코드는 최대 20 자입니다")
    private String mberTypeCd;

    @Size(max = 11, message = "팩스 번호는 최대 11 자입니다")
    private String faxNo;

    @JsonProperty("insttCode")
    @JsonAlias({"insttCode", "insttCd"})
    @Size(max = 20, message = "기관 코드는 최대 20 자입니다")
    private String insttCd;

    @Size(max = 20, message = "조직 ID 는 최대 20 자입니다")
    private String orgnztId;

    @Size(max = 20, message = "그룹 ID 는 최대 20 자입니다")
    private String groupId;

    @Size(max = 300, message = "주소는 최대 300 자입니다")
    private String homeAddr;

    @Size(max = 300, message = "상세주소는 최대 300 자입니다")
    private String daddr;

    @Size(max = 5, message = "우편번호는 5자입니다")
    private String zip;

    @Size(max = 20, message = "사무실 전화번호는 최대 20 자입니다")
    private String officeTelno;

    @Size(max = 11, message = "휴대폰 번호는 최대 11 자입니다")
    private String mblTelno;

    @Size(max = 50, message = "이메일은 최대 50 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "이메일 형식이 올바르지 않습니다")
    private String emlAddr;

    @Size(max = 300, message = "직함은 최대 300 자입니다")
    private String ofcpsNm;

    @Size(max = 255, message = "DN 정보는 최대 255 자입니다")
    private String subDn;

    @Size(max = 10, message = "사용자 구분은 최대 10 자입니다")
    private String userSe;

    @Size(max = 12, message = "사용자 상태 코드는 최대 12 자입니다")
    private String userSttsCd;
    
    private String lckYn;

    private LocalDateTime createdDate;

    // ----- [Legacy Aliases] -----
    public String getPassword() { return pswd; }
    public String getPasswordHint() { return pswdHint; }
    public String getPasswordCnsr() { return pswdCrans; }
    public String getHomeadres() { return homeAddr; }
    public String getDetailAdres() { return daddr; }
    public String getSexdstnCode() { return gndrCd; }
    public String getBrth() { return brthYmd; }
    public String getFxnum() { return faxNo; }
    public String getOffmTelno() { return officeTelno; }
    public String getMoblphonNo() { return mblTelno; }
    public String getEmailAdres() { return emlAddr; }
    public String getUserSttusCode() { return userSttsCd; }
    public String getLockAt() { return lckYn; }

    @JsonIgnore
    public String getHomemiddleTelno() { return homeMiddleTelno; }
    @JsonIgnore
    public String getHomeendTelno() { return homeEndTelno; }
    @JsonIgnore
    public String getMberTyCode() { return mberTypeCd; }
    @JsonIgnore
    public String getInsttCode() { return insttCd; }

    public void setPassword(String v) { this.pswd = v; }
    public void setPasswordHint(String v) { this.pswdHint = v; }
    public void setPasswordCnsr(String v) { this.pswdCrans = v; }
    public void setHomeadres(String v) { this.homeAddr = v; }
    public void setDetailAdres(String v) { this.daddr = v; }
    public void setSexdstnCode(String v) { this.gndrCd = v; }
    public void setBrth(String v) { this.brthYmd = v; }
    public void setFxnum(String v) { this.faxNo = v; }
    public void setOffmTelno(String v) { this.officeTelno = v; }
    public void setMoblphonNo(String v) { this.mblTelno = v; }
    public void setEmailAdres(String v) { this.emlAddr = v; }
    public void setUserSttusCode(String v) { this.userSttsCd = v; }
    public void setLockAt(String v) { this.lckYn = v; }

    @JsonIgnore
    public void setHomemiddleTelno(String v) { this.homeMiddleTelno = v; }
    @JsonIgnore
    public void setHomeendTelno(String v) { this.homeEndTelno = v; }
    @JsonIgnore
    public void setMberTyCode(String v) { this.mberTypeCd = v; }
    @JsonIgnore
    public void setInsttCode(String v) { this.insttCd = v; }

    // ----- [Standard CamelCase Accessors] -----
    public String getHomeMiddleTelno() { return homeMiddleTelno; }
    public String getHomeEndTelno() { return homeEndTelno; }
    public String getInsttCd() { return insttCd; }
    public String getMberTypeCd() { return mberTypeCd; }

    public void setHomeMiddleTelno(String v) { this.homeMiddleTelno = v; }
    public void setHomeEndTelno(String v) { this.homeEndTelno = v; }
    public void setInsttCd(String v) { this.insttCd = v; }
    public void setMberTypeCd(String v) { this.mberTypeCd = v; }

    public static UserDto from(nuri.foundation.domain.user.entity.User user) {
        if (user == null)
            return null;
        return UserDto.builder()
                .userId(Objects.requireNonNull(user.getUserId()))
                .userNm(Objects.requireNonNull(user.getUserNm()))
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .pswd(user.getPswd())
                .pswdHint(user.getPswdHint())
                .pswdCrans(user.getPswdCrans())
                .emplNo(user.getEmplNo())
                .gndrCd(user.getGndrCd())
                .brthYmd(user.getBrthYmd())
                .areaNo(user.getAreaNo())
                .homeMiddleTelno(user.getHomemiddleTelno())
                .homeEndTelno(user.getHomeendTelno())
                .faxNo(user.getFaxNo())
                .insttCd(user.getInsttCode())
                .orgnztId(user.getOrgnztId())
                .groupId(user.getGroupId())
                .homeAddr(user.getHomeAddr())
                .daddr(user.getDaddr())
                .zip(user.getZip())
                .officeTelno(user.getOfficeTelno())
                .mblTelno(user.getMblTelno())
                .emlAddr(user.getEmlAddr())
                .ofcpsNm(user.getOfcpsNm())
                .subDn(user.getSubDn())
                .userSttsCd(user.getUserSttsCd())
                .lckYn(user.getLckYn())
                .createdDate(user.getCreatedDate())
                .build();
    }
}
