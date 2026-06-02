package nuri.business.service.addressbook.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "주소록 정보 DTO")
public class AddressBookDto {
    @Schema(description = "주소록 ID")
    private String adbkId;

    @NotBlank(message = "주소록 명칭은 필수입니다.")
    @Size(max = 100, message = "주소록 명칭은 100자 이내여야 합니다.")
    @Schema(description = "주소록 명칭", example = "마케팅팀 주소록")
    private String adbkNm;

    @NotBlank(message = "공개 범위 설정은 필수입니다.")
    @Schema(description = "공개 범위 코드", example = "PUB")
    private String rlsScopeCd;

    @Schema(description = "대상 조직 ID", example = "ORGNZT_0000000000001")
    private String trgetOrgnztId;

    @Schema(description = "사용 여부", example = "Y")
    private String useYn;

    @Schema(description = "작성자 ID", example = "USRCNFRM_00000000001")
    private String wrterId;

    @Builder.Default
    @Schema(description = "주소록 내 연락처 목록")
    private List<AddressBookUserDto> adbkMan = new java.util.ArrayList<>();

    @Schema(description = "최초 등록자 ID")
    private String frstRgtrId;
    @Schema(description = "최초 등록 일시")
    private LocalDateTime crtDt;
    @Schema(description = "최종 수정자 ID")
    private String lastMdfrId;
    @Schema(description = "최종 수정 일시")
    private LocalDateTime mdfcnDt;

}

