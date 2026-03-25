package com.company.project.foundation.domain.log;
import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "SWEBLOGSUMMARY")
@IdClass(WebLogSummaryId.class)
@SuperBuilder
public class WebLogSummary extends BaseEntity {

    @Id
    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrncDe;

    @Id
    @Column(name = "URL", length = 200)
    private String url;

    @Column(name = "RDCNT")
    private Long rdcnt;

    public WebLogSummary(String occrrncDe, String url, Long rdcnt) {
        this.occrrncDe = occrrncDe;
        this.url = url;
        this.rdcnt = rdcnt;
    }
}
