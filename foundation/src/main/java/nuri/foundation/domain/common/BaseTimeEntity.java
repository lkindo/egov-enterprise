package nuri.foundation.domain.common;
// Force re-scan

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
 * [Standardization] CreatedDate -> frstRegistPnttm, LastModifiedDate -> lastUpdtPnttm 별칭 제공
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    @CreatedDate
    @Column(name = "CREAT_DT", updatable = false)
    protected LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "MDFCN_DT")
    protected LocalDateTime lastModifiedDate;

    // ----- [Legacy Aliases] -----
    
    public LocalDateTime getFrstRegistPnttm() {
        return createdDate;
    }

    public LocalDateTime getLastUpdtPnttm() {
        return lastModifiedDate;
    }

    // Variations for different DTOs/Services
    public LocalDateTime getFrstRegisterPnttm() {
        return createdDate;
    }

    public LocalDateTime getLastUpdusrPnttm() {
        return lastModifiedDate;
    }

    public void setFrstRegistPnttm(LocalDateTime dateTime) {
        this.createdDate = dateTime;
    }

    public void setLastUpdtPnttm(LocalDateTime dateTime) {
        this.lastModifiedDate = dateTime;
    }
}
