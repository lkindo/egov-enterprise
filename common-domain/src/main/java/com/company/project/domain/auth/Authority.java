package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NAUTHORINFO")
public class Authority {

    @Id
    @Column(name = "AUTHOR_CODE", length = 30)
    private String authorCode;

    @Column(name = "AUTHOR_NM", nullable = false, length = 60)
    private String authorNm;

    @Column(name = "AUTHOR_DC", length = 200)
    private String authorDc;

    @Column(name = "AUTHOR_CREAT_DE")
    private LocalDateTime authorCreatDe;

    @Builder
    public Authority(String authorCode, String authorNm, String authorDc) {
        this.authorCode = authorCode;
        this.authorNm = authorNm;
        this.authorDc = authorDc;
        this.authorCreatDe = LocalDateTime.now();
    }

    public void update(String authorNm, String authorDc) {
        this.authorNm = authorNm;
        this.authorDc = authorDc;
    }
}
