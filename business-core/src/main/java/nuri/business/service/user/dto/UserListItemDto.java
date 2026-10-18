package nuri.business.service.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 사용자 목록의 한 행(2026-10-19, 응답 전용).
 *
 * <p>목록은 휴대전화·이메일을 가린 값으로 싣는다(UserDto#withMaskedContacts). 등록·수정 요청에 쓰는 {@link UserDto} 를
 * 그대로 내보내면 그 입력 검증(@Pattern 이메일 형식)이 응답 스키마에도 실려, 가린 이메일(ho***@example.com)을 화면의
 * 응답 검증이 거부하고 목록 전체가 사라진다. 그래서 목록 응답은 입력 규칙이 없는 이 레코드로 나간다. 원문 연락처는
 * 정보주체를 기록하는 상세 조회(UserDto)에서만 나간다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserListItemDto(
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String userId,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String userNm,
    String esntlId,
    String role,
    String emplNo,
    String officeTelno,
    @Schema(description = "가린 휴대전화(예: 010****5678). 원문은 상세 조회에서만 나간다.") String mblTelno,
    @Schema(description = "가린 이메일(예: ho***@example.com). 원문은 상세 조회에서만 나간다.") String emlAddr,
    String ofcpsNm,
    String ognzId,
    String userSttsCd,
    String lckYn,
    LocalDateTime crtDt,
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, requiredMode = Schema.RequiredMode.REQUIRED) List<String> groups,
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, requiredMode = Schema.RequiredMode.REQUIRED) List<String> permissions,
    @Schema(accessMode = Schema.AccessMode.READ_ONLY, requiredMode = Schema.RequiredMode.REQUIRED) String authorizationVersion
) {
    /** 목록 조회가 만든 행(이미 연락처를 가리고 권한 스냅숏을 붙인 UserDto)을 목록 응답으로 옮긴다. 값은 바꾸지 않는다. */
    public static UserListItemDto from(UserDto user) {
        return new UserListItemDto(user.userId(), user.userNm(), user.esntlId(), user.role(), user.emplNo(),
                user.officeTelno(), user.mblTelno(), user.emlAddr(), user.ofcpsNm(), user.ognzId(), user.userSttsCd(),
                user.lckYn(), user.crtDt(), user.groups(), user.permissions(), user.authorizationVersion());
    }
}
