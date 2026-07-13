package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @Size(max = 20)
    private String pstId;
    private String dgstfnCn;
    private Integer dgstfnScr;
    private String userId;
    private String userNm;
    // [보안] 만족도 작성 비밀번호는 요청(write)으로만 수용, 응답(read)에 직렬화 금지.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String pswd;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private LocalDateTime crtDt;

    // legacy
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
