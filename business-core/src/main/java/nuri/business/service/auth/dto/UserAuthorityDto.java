package nuri.business.service.auth.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.jspecify.annotations.NonNull;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "사용자 권한 정보 DTO")
public class UserAuthorityDto {
    // JSpecify @NonNull 은 TYPE_USE 전용이라 springdoc 이 필드 선언에서 읽지 못한다. 종전 Spring @NonNull 이 만들던
    //   OpenAPI required 를 명시로 보존한다(ADR-0024). Lombok null 검사는 이름으로 인식해 종전과 같다.
    @Schema(description = "보안 고유 ID (사용자 고유 ID)", example = "USRCNFRM_00000000001",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NonNull
    @Size(max = 20)
    private String scrtyDcsnTrgtId;

    @Schema(description = "부여할 권한 코드", example = "ROLE_USER")
    @NonNull
    @Size(max = 20)
    @NotBlank
    private String authrtId;

    @Schema(description = "회원 유형 코드", example = "USR01")
    @Size(max = 12)
    private String mbrTypeCd;

    @Schema(description = "사용자 명", example = "홍길동")
    @Size(max = 100)
    private String userNm; // For display purposes if needed
}

