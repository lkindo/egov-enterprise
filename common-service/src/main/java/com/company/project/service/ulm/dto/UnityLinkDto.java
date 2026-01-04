package com.company.project.service.ulm.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnityLinkDto {
    private String unityLinkId;
    private String unityLinkSeCode;
    private String unityLinkNm;
    private String unityLinkUrl;
    private String unityLinkDc;
}
