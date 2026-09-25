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
    // [2026-09-22 GAP-CONTRACT-001] 물리 컬럼 4000 을 입력에서 보호한다 — 없으면 4001자 입력이 검증을 지나 DB 오류(500)로 죽는다.
    @Size(max = 4000)
    private String dgstfnCn;
    // [2026-09-26 DIP I6 ⑤] 점수는 필수이며 1~5 다(화면 별점과 DB CHECK 와 같은 범위). 없으면 NULL 이 NOT NULL
    //   컬럼에서 500 으로, 범위 밖 값은 평균을 왜곡한 채 저장됐다.
    @NotNull
    @Min(1)
    @Max(5)
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
