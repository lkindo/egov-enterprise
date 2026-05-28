package nuri.business.service.calendar.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.calendar.Restde;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 휴일 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "휴일 관리 정보 DTO")
public class RestdeDto {

    @Schema(description = "휴일 일련번호", example = "1")
    private Integer hldySn;

    @Schema(description = "휴일 일자", example = "2026-05-25")
    @Size(max = 8)
    private String hldyYmd;

    @Schema(description = "휴일 명칭", example = "석가탄신일")
    @Size(max = 100)
    private String hldyNm;

    @Schema(description = "휴일 설명", example = "음력 4월 8일")
    @Size(max = 4000)
    private String hldyExpln;

    @Schema(description = "휴일 구분 코드", example = "01")
    @Size(max = 12)
    private String hldySeCd;

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

