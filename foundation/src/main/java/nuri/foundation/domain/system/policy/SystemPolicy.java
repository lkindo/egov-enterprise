package nuri.foundation.domain.system.policy;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 시스템 정책(저작권, 개인정보처리방침 등) 엔티티
 * 매핑 테이블: NPOLICY
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_plcy_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SystemPolicy extends BaseEntity {

    @Id
    @Column(name = "plcy_type_cd", length = 30)
    private String policyType;

    @Column(name = "plcy_ttl", length = 255, nullable = false)
    private String title;

    @Column(name = "plcy_cn", columnDefinition = "text", nullable = false)
    private String content;

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }
}
