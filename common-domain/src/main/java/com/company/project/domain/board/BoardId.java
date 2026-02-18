package com.company.project.domain.board;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.lang.NonNull;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@NoArgsConstructor
@EqualsAndHashCode
public class BoardId implements Serializable {
    private static final long serialVersionUID = 1L;

    @Column(name = "NTT_ID")
    @NonNull
    private Long nttId;

    @Column(name = "BBS_ID")
    @NonNull
    private String bbsId;

    public BoardId(@NonNull Long nttId, @NonNull String bbsId) {
        this.nttId = Objects.requireNonNull(nttId);
        this.bbsId = Objects.requireNonNull(bbsId);
    }
}
