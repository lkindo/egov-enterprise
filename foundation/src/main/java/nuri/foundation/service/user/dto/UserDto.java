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
    private String password;

    @Size(max = 100, message = "비밀번호 힌트는 최대 100 자입니다")
    private String passwordHint;

    @Size(max = 100, message = "비밀번호 정답은 최대 100 자입니다")
    private String passwordCnsr;
    
    @Size(max = 50, message = "권한명은 최대 50 자입니다")
    private String role;

    @Size(max = 20, message = "사번은 최대 20 자입니다")
    private String emplNo;

    @Size(max = 30, message = "성별 코드는 최대 30 자입니다")
    private String gndrCd;

    @Size(max = 8, message = "생년월일은 8자입니다")
    private String brthYmd;

    @Size(max = 4, message = "지역번호는 최대 4 자입니다")
    private String areaNo;

    @Size(max = 4, message = "전화번호 중간자리는 최대 4 자입니다")
    private String homemiddleTelno;

    @Size(max = 4, message = "전화번호 끝자리는 최대 4 자입니다")
    private String homeendTelno;

    @Size(max = 20, message = "회원 유형 코드는 최대 20 자입니다")
    private String mberTyCode;

    @Size(max = 20, message = "팩스 번호는 최대 20 자입니다")
    private String faxNo;

    @Size(max = 20, message = "기관 코드는 최대 20 자입니다")
    private String insttCode;

    @Size(max = 20, message = "조직 ID 는 최대 20 자입니다")
    private String orgnztId;

    @Size(max = 20, message = "그룹 ID 는 최대 20 자입니다")
    private String groupId;

    @Size(max = 300, message = "주소는 최대 300 자입니다")
    private String homeadres;

    @Size(max = 300, message = "상세주소는 최대 300 자입니다")
    private String detailAdres;

    @Size(max = 5, message = "우편번호는 5자입니다")
    private String zip;

    @Size(max = 20, message = "사무실 전화번호는 최대 20 자입니다")
    private String officeTelno;

    @Size(max = 11, message = "휴대폰 번호는 최대 11 자입니다")
    private String mblTelno;

    @Size(max = 300, message = "이메일은 최대 300 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "이메일 형식이 올바르지 않습니다")
    private String emlAddr;

    @Size(max = 60, message = "직함은 최대 60 자입니다")
    private String ofcpsNm;

    @Size(max = 255, message = "DN 정보는 최대 255 자입니다")
    private String subDn;

    @Size(max = 10, message = "사용자 구분은 최대 10 자입니다")
    private String userSe;

    @Size(max = 30, message = "사용자 상태 코드는 최대 30 자입니다")
    private String userSttsCd;
    
    private String lckYn;

    private LocalDateTime createdDate;

    // ----- [Legacy Aliases] -----
    public String getSexdstnCode() { return gndrCd; }
    public String getBrth() { return brthYmd; }
    public String getFxnum() { return faxNo; }
    public String getOffmTelno() { return officeTelno; }
    public String getMoblphonNo() { return mblTelno; }
    public String getEmailAdres() { return emlAddr; }
    public String getUserSttusCode() { return userSttsCd; }
    public String getLockAt() { return lckYn; }

    public void setSexdstnCode(String v) { this.gndrCd = v; }
    public void setBrth(String v) { this.brthYmd = v; }
    public void setFxnum(String v) { this.faxNo = v; }
    public void setOffmTelno(String v) { this.officeTelno = v; }
    public void setMoblphonNo(String v) { this.mblTelno = v; }
    public void setEmailAdres(String v) { this.emlAddr = v; }
    public void setUserSttusCode(String v) { this.userSttsCd = v; }
    public void setLockAt(String v) { this.lckYn = v; }

    public static UserDto from(nuri.foundation.domain.user.entity.User user) {
        if (user == null)
            return null;
        return UserDto.builder()
                .userId(Objects.requireNonNull(user.getUserId()))
                .userNm(Objects.requireNonNull(user.getUserNm()))
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .emplNo(user.getEmplNo())
                .gndrCd(user.getGndrCd())
                .brthYmd(user.getBrthYmd())
                .areaNo(user.getAreaNo())
                .homemiddleTelno(user.getHomemiddleTelno())
                .homeendTelno(user.getHomeendTelno())
                .faxNo(user.getFaxNo())
                .insttCode(user.getInsttCode())
                .orgnztId(user.getOrgnztId())
                .groupId(user.getGroupId())
                .homeadres(user.getHomeadres())
                .detailAdres(user.getDetailAdres())
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
