package nuri.foundation.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;

/**
 * 권한 정보 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorManageDto {
    /** 권한코드 */
    @JsonProperty("authorCode")
    @NotBlank(message = "권한코드는 필수 입력 사항입니다.")
    @Size(max = 30)
    @NonNull
    private String authrtCd;

    /** 권한명 */
    @JsonProperty("authorNm")
    @NotBlank(message = "권한명은 필수 입력 사항입니다.")
    @Size(max = 60)
    @NonNull
    private String authrtNm;

    /** 권한설명 */
    @JsonProperty("authorDc")
    @Size(max = 200)
    private String authrtExpln;

    /** 권한생성일 */
    @JsonProperty("authorCreatDe")
    private String authrtCrtYmd;
}
