package nuri.business.service.sms.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    public static final int MAX_RECIPIENTS_PER_REQUEST = 100;

    @Schema(description = "SMS 전송 일련번호")
    private Long smsTrsmSn;

    @Schema(description = "발신 번호", minLength = 1, maxLength = 13, pattern = "^[0-9-]+$")
    @NotBlank
    @Size(min = 1, max = 13)
    @Pattern(regexp = "^[0-9-]+$")
    private String sndngTelno;

    @Schema(description = "발신 내용", minLength = 1, maxLength = 4000)
    @NotBlank
    @Size(min = 1, max = 4000)
    private String sndngCn;

    @Schema(description = "수신자 수")
    private Integer recptnCnt;

    @Schema(description = "최초 등록자")
    private String frstRgtrId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime crtDt;



    @ArraySchema(
            arraySchema = @Schema(description = "수신자 목록"),
            schema = @Schema(implementation = SmsRecptnDto.class),
            minItems = 1,
            maxItems = MAX_RECIPIENTS_PER_REQUEST)
    @Builder.Default
    @NotEmpty
    @Size(min = 1, max = MAX_RECIPIENTS_PER_REQUEST)
    @Valid
    private List<SmsRecptnDto> recipients = new java.util.ArrayList<>();

    @Schema(description = "검색 조건")
    private String searchCondition;

    @Schema(description = "검색어")
    private String searchWrd;
}
