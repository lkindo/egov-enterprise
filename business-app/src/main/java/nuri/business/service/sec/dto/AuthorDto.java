package nuri.business.service.sec.dto;

import jakarta.validation.constraints.*;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorDto {
    @org.springframework.lang.NonNull
    @Size(max = 12)
    private String authrtCd;
    @org.springframework.lang.NonNull
    @Size(max = 300)
    @NotBlank
    private String authrtNm;
    @Size(max = 4000)
    private String authrtExpln;
    private String authrtCrtYmd;
}
