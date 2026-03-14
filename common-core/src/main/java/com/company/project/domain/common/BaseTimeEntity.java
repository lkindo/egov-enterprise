package com.company.project.domain.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 기본 시간 메타데이터 엔티티
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    protected LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    protected LocalDateTime lastModifiedDate;

    // 별칭 메서드 (전자정부 관례 대응)
    public LocalDateTime getFrstRegisterPnttm() {
        return createdDate;
    }

    public LocalDateTime getLastUpdusrPnttm() {
        return lastModifiedDate;
    }
}
