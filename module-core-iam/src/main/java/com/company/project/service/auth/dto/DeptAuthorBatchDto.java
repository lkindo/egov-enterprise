package com.company.project.service.auth.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class DeptAuthorBatchDto {
    private String deptId;
    private String authorCode;
    private List<String> userIds; // Optional: specify users or all in dept
    private boolean allMembers; // If true, apply to all in dept
}
