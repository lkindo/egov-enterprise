package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.lang.NonNull;
import java.time.LocalDateTime;
import java.util.Objects;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NAUTHORINFO")
public class Authority implements java.io.Serializable {
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
    private LocalDateTime authorCreatDe;

    @Builder
    public Authority(@NonNull String authorCode, @NonNull String authorNm, String authorDc) {
        this.authorCode = Objects.requireNonNull(authorCode);
        this.authorNm = Objects.requireNonNull(authorNm);
        this.authorDc = authorDc;
        this.authorCreatDe = LocalDateTime.now();
    }

    public void update(@NonNull String authorNm, String authorDc) {
        this.authorNm = Objects.requireNonNull(authorNm);
        this.authorDc = authorDc;
    }
}
