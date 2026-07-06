package nuri.business.service.board.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.board.Satisfaction;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SatisfactionDto {
    private Long dgstfnSn;
    @Size(max = 20)
    private String bbsId;
    @Size(max = 20)
    private String pstId;
    private String dgstfnCn;
    private Integer dgstfnScr;
    private String userId;
    private String userNm;
    private String pswd;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private LocalDateTime crtDt;

    // legacy
    // 레거시 별칭 완전 철폐 (표준화 동기화)

    public static SatisfactionDto from(Satisfaction entity) {
        if (entity == null) return null;
        return SatisfactionDto.builder()
                .dgstfnSn(entity.getDgstfnSn())
                .bbsId(entity.getBbsId())
                .pstId(entity.getPstId())
                .dgstfnCn(entity.getDgstfnCn())
                .dgstfnScr(entity.getDgstfnScr())
                .userId(entity.getUserId())
                .userNm(entity.getUserNm())
                .pswd(entity.getPswd())
                .useYn(entity.getUseYn())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
