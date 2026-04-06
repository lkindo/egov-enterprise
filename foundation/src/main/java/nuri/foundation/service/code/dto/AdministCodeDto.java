package nuri.foundation.service.code.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdministCodeDto {
    private String administZoneCode;
    private String administZoneSe;
    private String administZoneNm;
    private String upperAdministZoneCode;
    private String useAt;
    private String creatDe;
    private String ablDe;
    private String createdBy;
    private LocalDateTime createdDate;
    private String lastModifiedBy;
    private LocalDateTime lastModifiedDate;
}
