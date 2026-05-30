package nuri.business.domain.user.entity;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 사용자 부재 정보 엔티티
 */
@Entity
@Table(name = "tb_user_absn")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class UserAbsence extends BaseEntity {

    @Id
    @Column(name = "user_id", length = 20)
    private String userId;

    @Column(length = 1, nullable = false)
    private String userAbsnYn; // Y: 부재, N: 정상

    public void updateAbsence(String userAbsnYn) {
        this.userAbsnYn = userAbsnYn;
    }

    // ----- [Legacy Aliases for Compatibility] -----
    public String getUserAbsnceAt() { return userAbsnYn; }
    public void setUserAbsnceAt(String v) { this.userAbsnYn = v; }

    // legacy
    public String getEmplyrId() { return userId; }
    public void setEmplyrId(String v) { this.userId = v; }
}
