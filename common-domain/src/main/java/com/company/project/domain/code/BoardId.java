package com.company.project.domain.code;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BoardId implements Serializable {
    private Long id;
    private String boardMaster; // JoinColumn name matching the field in Board
}
