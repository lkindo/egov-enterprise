package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 설문 응답자 DTO (표준화)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "설문 응답자 DTO")
public class SurveyRespondentDto {

    @Schema(description = "설문 응답자 ID")
    @Size(max = 20)
    private String srvyRspdntId;

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String srvyId;

    @Schema(description = "설문 템플릿 ID")
    @Size(max = 20)
    private String srvyTmpltId;

    @Schema(description = "성별 코드")
    @Size(max = 30)
    private String gndrCd;

    @Schema(description = "직업 유형 코드")
    @Size(max = 12)
    private String crTypeCd;

    @Schema(description = "응답자 명")
    @Size(max = 100)
    private String rspdntNm;

    @Schema(description = "생년월일")
    @Size(max = 8)
    private String brdt;

    @Schema(description = "지역 전화번호")
    @Size(max = 4)
    private String rgnTelno;

    @Schema(description = "국번 전화번호")
    @Size(max = 4)
    private String midTelno;

    @Schema(description = "개별 전화번호")
    @Size(max = 4)
    private String endTelno;

    @Schema(description = "최초 등록자 ID")
    private String frstRgtrId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime crtDt;

    @Schema(description = "최종 수정자 ID")
    private String lastMdfrId;

    @Schema(description = "최종 수정 일시")
    private LocalDateTime mdfcnDt;
}
