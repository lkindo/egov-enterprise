package nuri.business.domain.system.policy;

import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 12)
    private String plcyTypeCd;

    @Column(length = 100, nullable = false)
    private String plcyTtl;

    @Column(columnDefinition = "text", nullable = false, length = 4000)
    private String plcyCn;

    public void update(String plcyTtl, String plcyCn) {
        this.plcyTtl = plcyTtl;
        this.plcyCn = plcyCn;
    }
}
