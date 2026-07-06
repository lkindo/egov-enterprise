package nuri.business.domain.user.entity;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 사용자 부재 정보 엔티티
 */
@Entity
@Table(name = "tb_user_absn")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAbsence extends BaseEntity {

    @Id
    @Column(length = 20)
    private String userId;

    @Column(length = 1, nullable = false)
    private String userAbsnYn; // Y: 부재, N: 정상

    private UserAbsence(String userId, String userAbsnYn) {
        this.userId = userId;
        this.userAbsnYn = userAbsnYn;
    }

    @Builder
    public static UserAbsence create(String userId, String userAbsnYn) {
        return new UserAbsence(userId, userAbsnYn);
    }

    public void updateAbsence(String userAbsnYn) {
        this.userAbsnYn = userAbsnYn;
    }


}
