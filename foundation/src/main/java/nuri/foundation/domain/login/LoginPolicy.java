package nuri.foundation.domain.login;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 로그인 정책 엔티티
 * 매핑 테이블: NLOGINPOLICY
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NLOGINPOLICY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LoginPolicy extends BaseEntity {

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "IP_INFO", length = 23)
    private String ipInfo;

    @Column(name = "DPLCT_PERM_AT", length = 1)
    private String dplctPermAt;

    @Column(name = "LMTT_AT", length = 1)
    private String lmttAt;

    public void update(String ipInfo, String dplctPermAt, String lmttAt) {
        this.ipInfo = ipInfo;
        this.dplctPermAt = dplctPermAt;
        this.lmttAt = lmttAt;
    }
}
