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
        @Size(max = 200) String homeAddr,
        @Size(max = 200) String daddr,
        @Size(max = 5) String zip,
        @Size(max = 20) String officeTelno,
        @Size(max = 11) String mblTelno,
        @Size(max = 50)
        @Pattern(regexp = "^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
        String emlAddr,
        @Size(max = 300) String ofcpsNm,
        @io.swagger.v3.oas.annotations.media.Schema(description = "프로필 편집 버전(V2_156). 조회한 값을 그대로 돌려보낸다 — 다르면 409, 없으면 400.",
                requiredMode = io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED)
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.Min(0)
        Integer version
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
                .version(version)
                .build();
    }
}
