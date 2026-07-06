package nuri.business.domain.notification;

import jakarta.persistence.*;
import nuri.business.domain.common.BaseEntity;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 사용자 알림 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@Entity
@Table(name = "tb_user_noti")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @Column(length = 20)
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

    @Column(length = 1)
    private String readYn = "N";

    @Column(length = 1000)
    private String linkUrl;

    private LocalDateTime notiDt;

    @Column(length = 100)
    private String notiIvlVal;

    /**
     * [Phase 5.2] 빌더 전용 생성자.
     * @Builder.Default 이던 readYn 의 기본값("N")을 널병합으로 재현한다.
     */
    private Notification(String notiSn, String notiTtlNm, String notiCn, String rcvrId,
                         String readYn, String linkUrl) {
        this.notiSn = notiSn;
        this.notiTtlNm = notiTtlNm;
        this.notiCn = notiCn;
        this.rcvrId = rcvrId;
        this.readYn = readYn != null ? readYn : "N";
        this.linkUrl = linkUrl;
    }

    /**
     * [Phase 5.2] 정적 팩토리. 기존 Notification.builder()...build() 호출부와 100% 호환.
     * 감사 필드(crtDt/mdfcnDt/frstRgtrId/lastMdfrId)와 읽기전용 연관(receiver),
     * 빌더 미설정 필드(notiDt/notiIvlVal)는 파라미터에서 제외한다.
     */
    @Builder
    public static Notification create(String notiSn, String notiTtlNm, String notiCn, String rcvrId,
                                      String readYn, String linkUrl) {
        return new Notification(notiSn, notiTtlNm, notiCn, rcvrId, readYn, linkUrl);
    }

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
