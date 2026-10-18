package nuri.api.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.service.user.dto.UserDto;

/**
 * 사용자 프로필 부분 수정 전용 요청.
 *
 * <p>사용자 식별자는 인증 주체 또는 경로가 소유하고 비밀번호는 전용 API만 변경한다.</p>
 */
@JsonIgnoreProperties({"userId", "pswd", "pswdHint", "pswdCrans"})
public record UserProfileUpdateRequest(
        @NotBlank
        @Pattern(regexp = "^[a-zA-Z0-9가-힣\\s]{2,50}$")
        String userNm,
        @Size(max = 20) String emplNo,
        @Size(max = 4) String areaNo,
        @Size(max = 4) String middleTelno,
        @Size(max = 4) String endTelno,
        @Size(max = 11) String faxNo,
        @Size(max = 200) String homeAddr,
        @Size(max = 200) String daddr,
        @Size(max = 5) String zip,
        @Size(max = 20) String officeTelno,
        // [2026-10-18] 관리자 목록은 휴대전화를 '010****5678' 로 가린다(길이 11). 그 값이 수정 폼으로 되돌아와 저장되면
        //   원문이 가린 값으로 덮인다 — '*' 를 받지 않는다. 이메일은 위 형식 규칙이 이미 '*' 를 거부한다.
        @Size(max = 11)
        @Pattern(regexp = "^[^*]*$", message = "가려진 휴대전화 번호는 저장할 수 없습니다")
        String mblTelno,
        @Size(max = 50)
        @Pattern(regexp = "^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
        String emlAddr,
        @Size(max = 300) String ofcpsNm,
        @Size(max = 20) String groupId,
        @Size(max = 20) String ognzId,
        @Size(max = 12) String pstinstCd
) {
    UserDto toUserDto() {
        return UserDto.builder()
                .userNm(userNm)
                .emplNo(emplNo)
                .areaNo(areaNo)
                .middleTelno(middleTelno)
                .endTelno(endTelno)
                .faxNo(faxNo)
                .homeAddr(homeAddr)
                .daddr(daddr)
                .zip(zip)
                .officeTelno(officeTelno)
                .mblTelno(mblTelno)
                .emlAddr(emlAddr)
                .ofcpsNm(ofcpsNm)
                .groupId(groupId)
                .ognzId(ognzId)
                .pstinstCd(pstinstCd)
                .build();
    }
}
