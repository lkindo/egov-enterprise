package nuri.foundation.service.operation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalHrDto {

    @JsonProperty("eventId")
    @JsonAlias({"eventId", "evntId"})
    private String evntId;

    @JsonProperty("extrlHrId")
    @JsonAlias({"extrlHrId", "otsdHrId"})
    private String otsdHrId;

    @JsonProperty("sexdstnCode")
    @JsonAlias({"sexdstnCode", "gndrCd"})
    private String gndrCd;

    @JsonProperty("extrlHrNm")
    @JsonAlias({"extrlHrNm", "otsdHrNm"})
    private String otsdHrNm;

    @JsonProperty("occpTyCode")
    @JsonAlias({"occpTyCode", "crTypeCd"})
    private String crTypeCd;

    @JsonProperty("psitnInsttNm")
    @JsonAlias({"psitnInsttNm", "ogdpInstNm"})
    private String ogdpInstNm;

    @JsonProperty("brthdy")
    @JsonAlias({"brthdy", "brdtYmd"})
    private String brdtYmd;

    private String areaNo;

    @JsonProperty("middleTelno")
    @JsonAlias({"middleTelno", "mdTelno"})
    private String mdTelno;

    private String endTelno;

    @JsonProperty("emailAdres")
    @JsonAlias({"emailAdres", "emlAddr"})
    private String emlAddr;

    private LocalDateTime frstRegistPnttm;
    private String frstRegisterId;
    private LocalDateTime lastUpdtPnttm;
    private String lastUpdusrId;
}
