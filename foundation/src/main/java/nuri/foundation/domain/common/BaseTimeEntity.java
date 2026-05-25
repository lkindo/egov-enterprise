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

    public static abstract class BaseTimeEntityBuilder<C extends BaseTimeEntity, B extends BaseTimeEntityBuilder<C, B>> {
        private LocalDateTime crtDt;
        private LocalDateTime mdfcnDt;

        public B createdDate(LocalDateTime createdDate) {
            this.crtDt = createdDate;
            return self();
        }

        public B lastModifiedDate(LocalDateTime lastModifiedDate) {
            this.mdfcnDt = lastModifiedDate;
            return self();
        }
    }

    @CreatedDate
    @Column(updatable = false)
    protected LocalDateTime crtDt;

    @LastModifiedDate
    protected LocalDateTime mdfcnDt;

    // ----- [Legacy Aliases for createdDate & lastModifiedDate] -----
    
    public LocalDateTime getCreatedDate() {
        return this.crtDt;
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        this.crtDt = createdDate;
    }

    public LocalDateTime getLastModifiedDate() {
        return this.mdfcnDt;
    }

    public void setLastModifiedDate(LocalDateTime lastModifiedDate) {
        this.mdfcnDt = lastModifiedDate;
    }

    // ----- [Legacy Aliases] -----
    
    public LocalDateTime getFrstRegistPnttm() {
        return crtDt;
    }

    public LocalDateTime getLastUpdtPnttm() {
        return mdfcnDt;
    }

    // Variations for different DTOs/Services
    public LocalDateTime getFrstRegisterPnttm() {
        return crtDt;
    }

    public LocalDateTime getLastUpdusrPnttm() {
        return mdfcnDt;
    }

    public void setFrstRegistPnttm(LocalDateTime dateTime) {
        this.crtDt = dateTime;
    }

    public void setLastUpdtPnttm(LocalDateTime dateTime) {
        this.mdfcnDt = dateTime;
    }
}
