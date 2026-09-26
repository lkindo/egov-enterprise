package nuri.business.service.addressbook.dto;

import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "주소록 연락처 정보 DTO")
public class AddressBookUserDto {
    /**
     * 구성원 식별자(2026-09-26 DIP B5 F8). 수정 요청에서 기존 구성원을 가리키는 유일한 키다 — 값이 있으면 그 구성원을
     * 고치고, 없으면 새 구성원이다. 요청에 없는 기존 구성원은 지운다.
     */
    @Schema(description = "주소록 회원 일련번호. 수정 요청에서 기존 구성원을 가리킨다(없으면 새 구성원)", example = "1")
    private Long adbkMbrSn;

    @Schema(description = "주소록 일련번호", example = "1")
    private Long adbkSn;

    /**
     * 연결된 사용자 식별자 — 서버 소유이며 요청에서 받지 않는다(2026-09-26 DIP B5 F8).
     *
     * <p>종전에는 필수 입력이었고 화면이 <b>작성자 자신의 ID</b>를 모든 구성원에 넣었다. 수정은 이 값으로 구성원을
     * 대조했으므로 구성원이 둘 이상이면 모두 같은 키가 되어 서로를 덮었다. 주소록 구성원은 손으로 적는 연락처라
     * 연결된 사용자가 없고(사용자 검색은 두지 않는다 — PD-ADBK-001), 구성원은 {@code adbkMbrSn} 으로 가리킨다.
     */
    @Schema(description = "연결된 사용자 ID(서버 소유, 요청에서 받지 않는다)", accessMode = Schema.AccessMode.READ_ONLY)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String userId;

    @Schema(description = "구성원명", example = "홍길동")
    @Size(max = 100)
    private String nm;

    /** 컬럼(tb_adbk_info.eml_addr, 320)과 같은 상한이다 — 종전 50 은 긴 주소를 400 으로 막았다. */
    @Schema(description = "이메일 주소", example = "user@example.com")
    @Size(max = 320)
    private String emlAddr;

    @Schema(description = "집 전화번호", example = "02-1234-5678")
    @Size(max = 11)
    private String homeTelno;

    @Schema(description = "휴대전화 번호", example = "010-1234-5678")
    @Size(max = 11)
    private String mblTelno;

    @Schema(description = "사무실 전화번호", example = "02-987-6543")
    @Size(max = 11)
    private String ofcTelno;

    @Schema(description = "팩스 번호", example = "02-111-2222")
    @Size(max = 11)
    private String faxNo;

}

