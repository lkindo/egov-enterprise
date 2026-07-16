package nuri.business.service.operation.dto;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "행사 정보 상세 DTO")
public class EventInfoDto {

    @Schema(description = "행사 ID", example = "EVT_1716611000000")
    @Size(max = 20)
    private String evntId;

    @Schema(description = "행사 명칭", example = "사내 인공지능 해커톤 캠페인", maxLength = 30)
    @Size(max = 30)
    private String bizCd; // Mapping bsnsCode to eventNm as a temporary measure if name is missing

    @Schema(description = "행사 연도", example = "2026")
    @Size(max = 4)
    private String bizYr;

    @Schema(description = "행사 상세내용", example = "기업용 차세대 거울 동기화 실증을 위한 전사 활동입니다.", maxLength = 4000)
    @Size(max = 4000)
    private String evntCn;

    @Schema(description = "행사 시작일", example = "20260525")
    @Size(max = 8)
    private String evntBgngYmd;

    @Schema(description = "행사 종료일", example = "20260526")
    @Size(max = 8)
    private String evntEndYmd;

    @Schema(description = "참여 정원 (Capacity)", example = "150")
    private Long evntUseCnt;

    @Schema(description = "담당자명", example = "홍길동")
    @Size(max = 300)
    private String picNm;

    @Schema(description = "준비 사항", example = "개인 노트북 지참 및 API 토큰 설정")
    @Size(max = 2500)
    private String prepMttr;

    @Schema(description = "행사 유형 코드", example = "EVT01")
    @Size(max = 12)
    private String evntTypeCd;

    @Schema(description = "승인 여부", example = "Y")
    @Size(max = 1)
    private String evntAprvYn;

    @Schema(description = "승인 일자", example = "20260525")
    @Size(max = 8)
    private String evntAprvYmd;

    @Schema(description = "최초 등록자 ID", example = "webmaster")
    private String frstRgtrId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime crtDt;

    @Schema(description = "최종 수정자 ID", example = "webmaster")
    private String lastMdfrId;

    @Schema(description = "최종 수정 일시")
    private LocalDateTime mdfcnDt;


    // 수기 from(EventInfo) 은 EventInfoMapper(MapStruct, 프레임워크 표준)로 대체됨.
}
