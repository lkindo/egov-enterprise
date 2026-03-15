package com.company.project.domain.auth;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.lang.NonNull;
import java.time.LocalDateTime;
import java.util.Objects;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "NAUTHORINFO")
@SuperBuilder
public class Authority extends BaseEntity implements java.io.Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "AUTHOR_CODE", length = 30)
    @NonNull
    private String authorCode;

    @Column(name = "AUTHOR_NM", nullable = false, length = 60)
    @NonNull
    private String authorNm;

    @Column(name = "AUTHOR_DC", length = 200)
    private String authorDc;

    @Column(name = "AUTHOR_CREAT_DE")
    @Builder.Default
    private LocalDateTime authorCreatDe = LocalDateTime.now();

    public void update(@NonNull String authorNm, String authorDc) {
        this.authorNm = Objects.requireNonNull(authorNm);
        this.authorDc = authorDc;
    }
}
