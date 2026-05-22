package nuri.business.service.calendar.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import nuri.business.domain.calendar.Restde;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 휴일 정보 물리 표준화 DTO
 * 
 * 백엔드 내부에서는 물리 표준 명칭인 hldySn, hldyYmd, hldyNm 등을 사용하고,
 * 외부 API 및 프론트엔드 통신 시에는 `@JsonProperty` Jackson 가드를 적용하여
 * 레거시 명칭인 restdeNo, restdeDe, restdeNm 등으로 직렬화/역직렬화되도록 보장합니다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestdeDto {

    @JsonProperty("restdeNo")
    private Integer hldySn;

    @JsonProperty("restdeDe")
    private String hldyYmd;

    @JsonProperty("restdeNm")
    private String hldyNm;

    @JsonProperty("restdeDc")
    private String hldyExpln;

    @JsonProperty("restdeSeCode")
    private String hldySeCd;

    // Legacy/Reverse compatibility JSON mappings
    // 레거시 Getter를 `@JsonIgnore`로 탑재하여 Jackson 직렬화 시 중복 릭 방지
    @JsonIgnore
    public Integer getRestdeNo() {
        return hldySn;
    }

    @JsonIgnore
    public String getRestdeDe() {
        return hldyYmd;
    }

    @JsonIgnore
    public String getRestdeNm() {
        return hldyNm;
    }

    @JsonIgnore
    public String getRestdeDc() {
        return hldyExpln;
    }

    @JsonIgnore
    public String getRestdeSeCode() {
        return hldySeCd;
    }

    public static RestdeDto from(Restde entity) {
        if (entity == null) {
            return null;
        }
        return RestdeDto.builder()
                .hldySn(entity.getRestdeNo())
                .hldyYmd(entity.getRestdeDe())
                .hldyNm(entity.getRestdeNm())
                .hldyExpln(entity.getRestdeDc())
                .hldySeCd(entity.getRestdeSeCode())
                .build();
    }
}
