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
    @Schema(description = "주소록 회원 일련번호", example = "1")
    private Long adbkMbrSn;

    @Schema(description = "주소록 일련번호", example = "1")
    private Long adbkSn;

    @Schema(description = "사용자 ID", example = "USRCNFRM_00000000001")
    @Size(max = 20)
    @NotBlank
    private String userId;

    @Schema(description = "구성원명", example = "홍길동")
    @Size(max = 100)
    private String nm;

    @Schema(description = "이메일 주소", example = "user@example.com")
    @Size(max = 50)
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

