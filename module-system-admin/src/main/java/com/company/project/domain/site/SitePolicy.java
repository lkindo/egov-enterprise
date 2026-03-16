package com.company.project.domain.site;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 시스템 정책 및 약관 관리를 위한 엔티티
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NSITEPOLICY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SitePolicy extends BaseEntity {

    @Id
    @Column(name = "POLICY_TYPE", length = 20)
    private String policyType; // copyright, privacy, etc.

    @Column(name = "TITLE", length = 200, nullable = false)
    private String title;

    @Column(name = "CONTENT", columnDefinition = "TEXT")
    private String content;

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }
}
