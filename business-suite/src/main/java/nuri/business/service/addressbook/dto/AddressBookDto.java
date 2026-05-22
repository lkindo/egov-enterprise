package nuri.business.service.addressbook.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    @Size(max = 100, message = "주소록 명칭은 100자 이내여야 합니다.")
    private String adbkNm;

    @NotBlank(message = "공개 범위 설정은 필수입니다.")
    private String rlsScopeCd;

    private String trgetOrgnztId;

    @JsonProperty("useAt")
    private String useYn;

    private String wrterId;

    @JsonProperty("nameCards")
    @Builder.Default
    private List<AddressBookUserDto> adbkMan = new java.util.ArrayList<>();

    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    // legacy
    @JsonIgnore
    public String getUseAt() { return useYn; }
    @JsonIgnore
    public void setUseAt(String v) { this.useYn = v; }
    @JsonIgnore
    public LocalDateTime getCreatedDate() { return frstRegistPnttm; }
    @JsonIgnore
    public List<AddressBookUserDto> getNameCards() { return adbkMan; }
}
