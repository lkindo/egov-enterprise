package nuri.business.service.mypage.dto;

import jakarta.validation.constraints.*;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualPageDto {
    @Size(max = 20)
    private String pageId;
    @Size(max = 300)
    @NotBlank
    private String pageTtl;
    @Size(max = 4000)
    private String pageExpln;
    @Size(max = 20)
    @NotBlank
    private String userId;
}
