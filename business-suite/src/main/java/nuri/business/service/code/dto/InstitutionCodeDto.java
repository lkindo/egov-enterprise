package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "기관코드 정보 DTO")
public class InstitutionCodeDto {

    @Schema(description = "기관코드")
    @Size(max = 20)
    private String instCd;

    @Schema(description = "전체기관명")
    @Size(max = 100)
    private String allInstNm;

    @Schema(description = "최하위기관명")
    @Size(max = 100)
    private String lwstInstNm;

    @Schema(description = "기관약칭명")
    @Size(max = 100)
    private String instAbbrNm;

    @Schema(description = "차수")
    @Size(max = 2)
    private String odr;

    @Schema(description = "서열")
    @Size(max = 3)
    private String ord;

    @Schema(description = "기관차수")
    @Size(max = 2)
    private String instCycl;

    @Schema(description = "최상위기관코드")
    @Size(max = 20)
    private String topInstCd;

    @Schema(description = "상위기관코드")
    @Size(max = 20)
    private String uprInstCd;

    @Schema(description = "대표기관코드")
    @Size(max = 20)
    private String reprsInstCd;

    @Schema(description = "기관유형대분류")
    @Size(max = 2)
    private String instTypeLclsf;

    @Schema(description = "기관유형중분류")
    @Size(max = 2)
    private String instTypeMclsf;

    @Schema(description = "기관유형소분류")
    @Size(max = 2)
    private String instTypeSclsf;

    @Schema(description = "전화번호")
    @Size(max = 20)
    private String telno;

    @Schema(description = "팩스번호")
    @Size(max = 11)
    private String faxNo;

    @Schema(description = "생성일자")
    @Size(max = 8)
    private String crtYmd;

    @Schema(description = "폐지일자")
    @Size(max = 8)
    private String ablYmd;

    @Schema(description = "폐지여부")
    @Size(max = 1)
    private String ablYn;

    @Schema(description = "변경일자")
    @Size(max = 8)
    private String chgYmd;

    @Schema(description = "변경시간")
    @Size(max = 20)
    private String chgTm;

    @Schema(description = "기준일자")
    @Size(max = 8)
    private String crtrYmd;

    @Schema(description = "정렬순서")
    private Integer sortOrdr;

}
