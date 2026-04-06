package nuri.business.service.addressbook.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressBookDto {
    private String adbkId;

    @NotBlank(message = "주소록 명칭은 필수입니다.")
    @Size(max = 255, message = "주소록 명칭은 255자 이내여야 합니다.")
    private String adbkNm;

    @NotBlank(message = "공개 범위 설정은 필수입니다.")
    private String othbcScope;

    private String trgetOrgnztId;
    private String useAt;
    private String wrterId;
    private List<AddressBookUserDto> adbkMan;

    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
}
