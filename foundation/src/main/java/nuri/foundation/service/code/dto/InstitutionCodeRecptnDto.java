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
public class InstitutionCodeRecptnDto {
    private String ocrnYmd;
    private String insttCode;
    private Long opertSn;
    private String changeSeCode;
    private String processSe;
    private String etcCode;
    private String allInsttNm;
    private String lowestInsttNm;
    private String insttAbrvNm;
    private String odr;
    private String ord;
    private String insttOdr;
    private String bestInsttCode;
    private String upperInsttCode;
    private String reprsntInsttCode;
    private String insttTyLclas;
    private String insttTyMclas;
    private String insttTySclas;
    private String telno;
    private String fxnum;
    private String creatDe;
    private String ablDe;
    private String ablEnnc;
    private String changede;
    private String changeTime;
    private String bsisDe;
    private Integer sortOrdr;
    private LocalDateTime frstRegisterPnttm;
    private String frstRegisterId;
}
