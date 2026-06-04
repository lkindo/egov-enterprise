package nuri.business.service.sec.dto;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleDto {
    @Size(max = 30)
    private String roleId;
    @Size(max = 100)
    @NotBlank
    private String roleNm;
    @Size(max = 300)
    private String rolePatrn;
    @Size(max = 4000)
    private String roleExpln;
    @Size(max = 12)
    private String roleTypeCd;
    private String roleSort;
    private String roleCrtYmd;

}
