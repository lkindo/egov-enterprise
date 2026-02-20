package com.company.project.domain.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * ??밴쉐??깅뻻, ??륁젟??깅뻻 ?癒?짗 疫꿸퀡以???袁る립 ?⑤벏???酉???
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastModifiedDate;

    public String getFrstRegisterPnttm() {
        return createdDate != null ? createdDate.format(formatter) : null;
    }

    public String getLastUpdusrPnttm() {
        return lastModifiedDate != null ? lastModifiedDate.format(formatter) : null;
    }

    public void setFrstRegisterPnttm(String pnttm) {
        // Compatibility
    }

    public void setFrstRegisterPnttm(LocalDateTime pnttm) {
        this.createdDate = pnttm;
    }

    public void setLastUpdtPnttm(String pnttm) {
        // Compatibility
    }

    public void setLastUpdusrPnttm(String pnttm) {
        // Compatibility
    }

    public void setLastUpdusrPnttm(LocalDateTime pnttm) {
        this.lastModifiedDate = pnttm;
    }
}
