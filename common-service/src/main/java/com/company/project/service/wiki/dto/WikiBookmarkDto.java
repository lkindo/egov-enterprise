package com.company.project.service.wiki.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WikiBookmarkDto {
    private String wikiBkmkId;
    private String userId;
    private String wikiBkmkNm;
}
