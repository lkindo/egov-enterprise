package nuri.business.domain.notification;

import jakarta.persistence.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.business.domain.common.BaseEntity;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

/**
 * 사용자 알림 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_user_noti")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Notification extends BaseEntity {

    @Id
    @Column(name = "noti_sn", length = 20)
    private String notiSn;

    @Column(length = 100)
    private String notiTtlNm;

    @Column(length = 4000)
    private String notiCn;

    @Column(name = "rcvr_id", length = 20)
    private String rcvrId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rcvr_id", referencedColumnName = "esntl_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.user.entity.User receiver;

    @Builder.Default
    @Column(length = 1)
    private String readYn = "N";

    @Column(length = 1000)
    private String linkUrl;

    private LocalDateTime notiDt;

    @Column(length = 100)
    private String notiIvlVal;

    public void markAsRead() {
        this.readYn = "Y";
    }

    public void update(String notiTtlNm, String notiCn, LocalDateTime notiDt, String notiIvlVal) {
        this.notiTtlNm = notiTtlNm;
        this.notiCn = notiCn;
        this.notiDt = notiDt;
        this.notiIvlVal = notiIvlVal;
    }

    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
