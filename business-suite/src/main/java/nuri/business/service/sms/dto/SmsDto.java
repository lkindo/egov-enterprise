package nuri.business.service.sms.dto;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import nuri.business.domain.sms.Sms;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "SMS 데이터 전송 객체")
public class SmsDto {

    @Schema(description = "SMS ID")
    @Size(max = 20)
    private String smsId;

    @Schema(description = "발신 번호")
    private String trnsmitTelno;

    @Schema(description = "발신 내용")
    private String trnsmitCn;

    @Schema(description = "수신 번호 (호환성용)")
    private String rcptnTelno;

    @Schema(description = "수신자 수")
    private Integer recptnCnt;

    @Schema(description = "최초 등록자")
    private String frstRgtrId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime createdDate;

    @Schema(description = "고유 식별자")
    private String uniqId;

    public String getFrstRegisterId() {
        return frstRgtrId;
    }

    public LocalDateTime getFrstRegisterPnttm() {
        return createdDate;
    }

    public LocalDateTime getTrnsmitPnttm() { return createdDate; }
    public LocalDateTime getFrstRegistPnttm() { return createdDate; }

    @Schema(description = "수신자 목록")
    @Builder.Default
    private List<SmsRecptnDto> recipients = new java.util.ArrayList<>();

    @Schema(description = "검색 조건")
    private String searchCondition;

    @Schema(description = "검색어")
    private String searchWrd;

    public static SmsDto from(Sms entity) {
        if (entity == null)
            return null;
        return SmsDto.builder()
                .smsId(entity.getSmsId())
                .trnsmitTelno(entity.getSndngTelno())
                .trnsmitCn(entity.getSndngCn())
                .recptnCnt(0)
                .frstRgtrId(entity.getFrstRgtrId())
                .createdDate(entity.getCreatedDate())
                .recipients(new java.util.ArrayList<>())
                .build();
    }
}
