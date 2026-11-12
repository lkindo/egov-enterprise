package nuri.business.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 사용자 부재 정보 엔티티
 *
 * <p>[V2_151] 부재 기간({@code absnBgngYmd}~{@code absnEndYmd}, yyyyMMdd 한국 날짜)과 그 기간에 대신 결재하는
 * 대리결재자({@code sbtAprvrId}, esntlId)를 둔다. 대리결재자를 두면 기간은 필수다(DB CHECK 와 서비스가 함께 지킨다).
 * 대리결재는 부재 중({@code userAbsnYn = 'Y'})이고 오늘이 기간 안일 때만 유효하다({@link #delegatesOn}).
 */
@Entity
@Table(name = "tb_user_absn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAbsence extends BaseEntity {

    @Id
    @Column(length = 20)
    private String userId;

    @Column(length = 1, nullable = false)
    private String userAbsnYn; // Y: 부재, N: 정상

    /** 부재 기간에 대신 결재하는 사용자(esntlId). 없으면 대리결재가 없다. */
    @Column(length = 20)
    private String sbtAprvrId;

    /** 부재시작일자(yyyyMMdd, 한국 날짜). */
    @Column(length = 8)
    private String absnBgngYmd;

    /** 부재종료일자(yyyyMMdd, 한국 날짜, 이 날까지 포함). */
    @Column(length = 8)
    private String absnEndYmd;

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
        if (!"Y".equals(userAbsnYn)) {
            // 부재가 끝나면 대리결재도 끝난다 — 다음 부재에 옛 대리결재자가 되살아나지 않게 비운다.
            clearDelegation();
        }
    }

    /**
     * 부재와 대리결재를 함께 정한다. 형식·자격(자기 지정·사용 중·기간 겹침·순환)은 서비스가 먼저 판정하고, 여기서는 상태
     * 조합만 지킨다 — 부재가 아니면 대리결재를 둘 수 없고, 대리결재자를 두면 기간이 있어야 한다.
     */
    public void updateDelegation(String userAbsnYn, String sbtAprvrId, String absnBgngYmd, String absnEndYmd) {
        if (sbtAprvrId != null && (!"Y".equals(userAbsnYn) || absnBgngYmd == null || absnEndYmd == null)) {
            throw new IllegalArgumentException("대리결재자는 부재 기간과 함께 둔다");
        }
        this.userAbsnYn = userAbsnYn;
        if (!"Y".equals(userAbsnYn)) {
            clearDelegation();
            return;
        }
        this.sbtAprvrId = sbtAprvrId;
        this.absnBgngYmd = absnBgngYmd;
        this.absnEndYmd = absnEndYmd;
    }

    /** 이 날(yyyyMMdd) 대리결재가 유효한가 — 부재 중이고 대리결재자가 있으며 날이 기간 안이다(양 끝 포함). */
    public boolean delegatesOn(String ymd) {
        return "Y".equals(userAbsnYn) && sbtAprvrId != null && absnBgngYmd != null && absnEndYmd != null
                && ymd != null && absnBgngYmd.compareTo(ymd) <= 0 && absnEndYmd.compareTo(ymd) >= 0;
    }

    private void clearDelegation() {
        this.sbtAprvrId = null;
        this.absnBgngYmd = null;
        this.absnEndYmd = null;
    }
}
