package com.company.project.domain.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * ??밴쉐?? ??밴쉐??깅뻻, ??륁젟?? ??륁젟??깅뻻 ?癒?짗 疫꿸퀡以???袁る립 ?⑤벏???酉???
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity extends BaseTimeEntity {

    @CreatedBy
    @Column(name = "FRST_REGISTER_ID", updatable = false, length = 20)
    protected String createdBy;

    @LastModifiedBy
    @Column(name = "LAST_UPDUSR_ID", length = 20)
    protected String lastModifiedBy;

    public String getFrstRegisterId() {
        return createdBy;
    }

    public String getLastUpdusrId() {
        return lastModifiedBy;
    }

    public void setFrstRegisterId(String id) {
        this.createdBy = id;
    }

    public void setLastUpdusrId(String id) {
        this.lastModifiedBy = id;
    }
}