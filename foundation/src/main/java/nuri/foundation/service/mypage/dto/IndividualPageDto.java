package nuri.foundation.service.mypage.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualPageDto {
    private String pageId;
    private String pageTtl;
    private String pageExpln;
    private String userId;
}
