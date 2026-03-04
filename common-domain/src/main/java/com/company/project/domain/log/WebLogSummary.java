package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "SWEBLOGSUMMARY")
@IdClass(WebLogSummaryId.class)
public class WebLogSummary {

    @Id
    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrncDe;

    @Id
    @Column(name = "URL", length = 200)
    private String url;

    @Column(name = "RDCNT")
    private Long rdcnt;

    @Builder
    public WebLogSummary(String occrrncDe, String url, Long rdcnt) {
        this.occrrncDe = occrrncDe;
        this.url = url;
        this.rdcnt = rdcnt;
    }
}