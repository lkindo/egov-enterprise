package com.company.project.service.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoTodoDto {
    private String todoId;
    private String todoNm;
    private String todoCn;
    private String todoBeginTime;
    private String todoEndTime;
    private String writerId;
    private String frstRegisterId;
}