package nuri.foundation.service.sec.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorDto {
    @org.springframework.lang.NonNull
    private String authrtCd;
    @org.springframework.lang.NonNull
    private String authrtNm;
    private String authrtExpln;
    private String authrtCrtYmd;
}
