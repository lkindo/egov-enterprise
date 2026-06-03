package nuri.business.service.user.dto;

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

    @Size(max = 4, message = "전화번호 중간자리는 최대 4 자입니다")
    private String middleTelno;

    @Size(max = 4, message = "전화번호 끝자리는 최대 4 자입니다")
    private String endTelno;

    @Size(max = 20, message = "회원 유형 코드는 최대 20 자입니다")
    private String mbrTypeCd;

    @Size(max = 11, message = "팩스 번호는 최대 11 자입니다")
    private String faxNo;

    @Size(max = 20, message = "기관 코드는 최대 20 자입니다")
    private String pstinstCd;

    @Size(max = 20, message = "조직 ID 는 최대 20 자입니다")
    private String ognzId;

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
    private String certDnVl;

    @Size(max = 10, message = "사용자 구분은 최대 10 자입니다")
    private String userSe;

    @Size(max = 12, message = "사용자 상태 코드는 최대 12 자입니다")
    private String userSttsCd;
    
    private String lckYn;

    private LocalDateTime crtDt;




    public static UserDto from(nuri.business.domain.user.entity.User user) {
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
                .middleTelno(user.getMiddleTelno())
                .endTelno(user.getEndTelno())
                .faxNo(user.getFaxNo())
                .pstinstCd(user.getPstinstCd())
                .ognzId(user.getOgnzId())
                .groupId(user.getGroupId())
                .homeAddr(user.getHomeAddr())
                .daddr(user.getDaddr())
                .zip(user.getZip())
                .officeTelno(user.getOfficeTelno())
                .mblTelno(user.getMblTelno())
                .emlAddr(user.getEmlAddr())
                .ofcpsNm(user.getOfcpsNm())
                .certDnVl(user.getCertDnVl())
                .userSttsCd(user.getUserSttsCd())
                .lckYn(user.getLckYn())
                .crtDt(user.getCrtDt())
                .build();
    }
}
