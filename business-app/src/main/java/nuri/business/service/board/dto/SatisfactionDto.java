package nuri.business.service.board.dto;

import jakarta.validation.constraints.*;

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
    private Long pstSn;
    private String dgstfnCn;
    private Integer dgstfnScr;
    private String userId;
    private String userNm;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private LocalDateTime crtDt;

    // legacy
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
