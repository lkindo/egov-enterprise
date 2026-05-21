package nuri.foundation.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
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

    @Column(name = "user_absnce_yn", length = 1, nullable = false)
    private String userAbsnceAt; // Y: 부재, N: 정상

    public void updateAbsence(String userAbsnceAt) {
        this.userAbsnceAt = userAbsnceAt;
    }

    // legacy
    public String getEmplyrId() { return userId; }
    public void setEmplyrId(String v) { this.userId = v; }
}
