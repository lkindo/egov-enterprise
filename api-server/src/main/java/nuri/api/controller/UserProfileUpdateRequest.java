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
        @Size(max = 300) String homeAddr,
        @Size(max = 300) String daddr,
        @Size(max = 5) String zip,
        @Size(max = 20) String officeTelno,
        @Size(max = 11) String mblTelno,
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
