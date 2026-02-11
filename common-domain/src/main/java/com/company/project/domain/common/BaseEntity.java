package com.company.project.domain.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 생성자, 생성일시, 수정자, 수정일시 자동 기록을 위한 공통 엔티티
 */
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity extends BaseTimeEntity {

    @CreatedBy
    @Column(name = "FRST_REGISTER_ID", updatable = false, length = 20)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastModifiedBy;
}
