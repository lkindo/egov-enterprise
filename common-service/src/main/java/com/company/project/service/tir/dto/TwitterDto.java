package com.company.project.service.tir.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TwitterDto {
    private String userId;
    private String cnsmrKey;
    private String cnsmrSecret;
}
