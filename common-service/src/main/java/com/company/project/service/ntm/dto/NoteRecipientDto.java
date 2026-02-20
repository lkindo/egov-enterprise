package com.company.project.service.ntm.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteRecipientDto {
    private String noteRecptnId;
    private String rcverId;
    private String rcverNm;
    private String recptnSe; // 1: ?섏떊, 2: 李몄“
}
