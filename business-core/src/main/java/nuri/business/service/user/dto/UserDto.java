package nuri.business.service.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import org.springframework.lang.NonNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;
import java.util.Objects;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.auth.UserAuthority;

/**
 * 사용자 관리 DTO (Record 버전)
 */
@Builder
public record UserDto(
    @NonNull
    @NotBlank(message = "사용자 ID 는 필수입니다")
    @Size(min = 4, max = 20, message = "사용자 ID 는 4-20 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "사용자 ID 는 영문, 숫자, 밑줄만 가능합니다")
    String userId,

    @NonNull
    @NotBlank(message = "사용자명은 필수입니다")
    @Pattern(regexp = "^[a-zA-Z0-9가-힣\\s]{2,50}$", message = "사용자명은 2~50자의 영문, 숫자, 한글만 가능합니다")
    String userNm,

    String esntlId,

    // [보안] 비밀번호 계열 필드는 요청(write)으로만 수용하고 응답(read)에는 절대 직렬화하지 않는다.
    // UserDto 가 request/response 겸용이라 from() 이 해시를 채우더라도 WRITE_ONLY 로 응답 노출을 원천 차단한다.
    //
    // [2026-08-11 그룹 한정] 아래 세 제약은 **등록 경로에만** 적용한다(UserValidationGroups.OnCreate).
    //   이 DTO 는 등록(POST /admin/system/users)과 수정(PUT /admin/system/users/{id}, PUT /users/me)이
    //   공유하는데, UserService.updateUser 는 비밀번호를 **한 번도 읽지 않는다** — 비밀번호 변경은
    //   전용 경로의 책임이다. 그럼에도 기본 그룹으로 걸려 있어 수정 요청이 비밀번호를 보내지 않는 한
    //   **항상 400** 이었다(2026-08-11 E2E 로 확인: PUT /api/v1/admin/system/users/{id} → 400).
    //   상세 근거와 새 등록 엔드포인트 추가 시 주의사항은 UserValidationGroups 참조.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotBlank(message = "비밀번호는 필수입니다", groups = UserValidationGroups.OnCreate.class)
    @Size(min = 8, max = 100, message = "비밀번호는 8-100 자입니다", groups = UserValidationGroups.OnCreate.class)
    @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$", message = "비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다", groups = UserValidationGroups.OnCreate.class)
    String pswd,

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Size(max = 300, message = "비밀번호 힌트는 최대 300 자입니다")
    String pswdHint,

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Size(max = 100, message = "비밀번호 정답은 최대 100 자입니다")
    String pswdCrans,
    
    @Size(max = 50, message = "권한명은 최대 50 자입니다")
    String role,

    @Size(max = 20, message = "사번은 최대 20 자입니다")
    String emplNo,

    @Size(max = 12, message = "성별 코드는 최대 12 자입니다")
    String gndrCd,

    @Size(max = 8, message = "생년월일은 8자입니다")
    String brthYmd,

    @Size(max = 4, message = "지역번호는 최대 4 자입니다")
    String areaNo,

    @Size(max = 4, message = "전화번호 중간자리는 최대 4 자입니다")
    String middleTelno,

    @Size(max = 4, message = "전화번호 끝자리는 최대 4 자입니다")
    String endTelno,

    @Size(max = 20, message = "회원 유형 코드는 최대 20 자입니다")
    String mbrTypeCd,

    @Size(max = 11, message = "팩스 번호는 최대 11 자입니다")
    String faxNo,

    @Size(max = 12, message = "기관 코드는 최대 12 자입니다")
    String pstinstCd,

    @Size(max = 20, message = "조직 ID 는 최대 20 자입니다")
    String ognzId,

    @Size(max = 20, message = "그룹 ID 는 최대 20 자입니다")
    String groupId,

    @Size(max = 300, message = "주소는 최대 300 자입니다")
    String homeAddr,

    @Size(max = 300, message = "상세주소는 최대 300 자입니다")
    String daddr,

    @Size(max = 5, message = "우편번호는 5자입니다")
    String zip,

    @Size(max = 20, message = "사무실 전화번호는 최대 20 자입니다")
    String officeTelno,

    @Size(max = 11, message = "휴대폰 번호는 최대 11 자입니다")
    String mblTelno,

    @Size(max = 50, message = "이메일은 최대 50 자입니다")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "이메일 형식이 올바르지 않습니다")
    String emlAddr,

    @Size(max = 300, message = "직함은 최대 300 자입니다")
    String ofcpsNm,

    @Size(max = 255, message = "DN 정보는 최대 255 자입니다")
    String certDnVl,

    @Size(max = 10, message = "사용자 구분은 최대 10 자입니다")
    String userSe,

    @Size(max = 12, message = "사용자 상태 코드는 최대 12 자입니다")
    String userSttsCd,
    
    String lckYn,

    LocalDateTime crtDt
) {
    public UserDto(
        String userId,
        String userNm,
        String esntlId,
        String role,
        String emplNo,
        String officeTelno,
        String mblTelno,
        String emlAddr,
        String ofcpsNm,
        LocalDateTime crtDt
    ) {
        this(
            userId,
            userNm,
            esntlId,
            null, // pswd
            null, // pswdHint
            null, // pswdCrans
            role,
            emplNo,
            null, // gndrCd
            null, // brthYmd
            null, // areaNo
            null, // middleTelno
            null, // endTelno
            null, // mbrTypeCd
            null, // faxNo
            null, // pstinstCd
            null, // ognzId
            null, // groupId
            null, // homeAddr
            null, // daddr
            null, // zip
            officeTelno,
            mblTelno,
            emlAddr,
            ofcpsNm,
            null, // certDnVl
            null, // userSe
            null, // userSttsCd
            null, // lckYn
            crtDt
        );
    }

    public static UserDto from(User user) {
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

    public static UserDto from(User user, UserAuthority authority) {
        if (user == null) return null;
        UserDto dto = from(user);
        String roleVal = authority != null ? authority.getAuthrtId() : (user.getRole() != null ? "ROLE_" + user.getRole().name() : "ROLE_USER");
        String userSeVal = authority != null ? authority.getMbrTypeCd() : "USR";

        return UserDto.builder()
                .userId(dto.userId())
                .userNm(dto.userNm())
                .esntlId(dto.esntlId())
                .pswd(dto.pswd())
                .pswdHint(dto.pswdHint())
                .pswdCrans(dto.pswdCrans())
                .role(roleVal)
                .emplNo(dto.emplNo())
                .gndrCd(dto.gndrCd())
                .brthYmd(dto.brthYmd())
                .areaNo(dto.areaNo())
                .middleTelno(dto.middleTelno())
                .endTelno(dto.endTelno())
                .faxNo(dto.faxNo())
                .pstinstCd(dto.pstinstCd())
                .ognzId(dto.ognzId())
                .groupId(dto.groupId())
                .homeAddr(dto.homeAddr())
                .daddr(dto.daddr())
                .zip(dto.zip())
                .officeTelno(dto.officeTelno())
                .mblTelno(dto.mblTelno())
                .emlAddr(dto.emlAddr())
                .ofcpsNm(dto.ofcpsNm())
                .certDnVl(dto.certDnVl())
                .userSe(userSeVal)
                .userSttsCd(dto.userSttsCd())
                .lckYn(dto.lckYn())
                .crtDt(dto.crtDt())
                .build();
    }
}
