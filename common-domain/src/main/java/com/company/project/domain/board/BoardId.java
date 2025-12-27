package com.company.project.domain.board;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BoardId implements Serializable {

    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "BBS_ID")
    private String bbsId;
}
