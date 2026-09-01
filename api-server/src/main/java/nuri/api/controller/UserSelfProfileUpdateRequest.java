package nuri.api.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.service.user.dto.UserDto;

/**
 * 로그인 사용자가 직접 바꿀 수 있는 프로필 필드만 담는 요청 계약.
 *
 * <p>소속 그룹·부서·기관은 관리자 소유 필드이므로 이 경계에서 역직렬화하지 않는다.</p>
 */
@JsonIgnoreProperties({
        "userId", "pswd", "pswdHint", "pswdCrans", "groupId", "ognzId", "pstinstCd"
})
public record UserSelfProfileUpdateRequest(
        @NotBlank
        @Pattern(regexp = "^[a-zA-Z0-9가-힣\\s]{2,50}$")
        String userNm,
        @Size(max = 20) String emplNo,
        @Size(max = 4) String areaNo,
        @Size(max = 4) String middleTelno,
        @Size(max = 4) String endTelno,
        @Size(max = 11) String faxNo,
        @Size(max = 300) String homeAddr,
        @Size(max = 300) String daddr,
        @Size(max = 5) String zip,
        @Size(max = 20) String officeTelno,
        @Size(max = 11) String mblTelno,
        @Size(max = 50)
        @Pattern(regexp = "^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
        String emlAddr,
        @Size(max = 300) String ofcpsNm
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
                .build();
    }
}
