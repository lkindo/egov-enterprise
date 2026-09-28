package nuri.business.service.addressbook.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 연락처가 아닌, 활성 사용자 선택에 필요한 최소 응답. */
public record AddressBookUserSelectionDto(
        @Schema(description = "사용자 내부 식별자. 로그인 ID가 아님") String esntlId,
        String userNm,
        String ognzNm) {
}
