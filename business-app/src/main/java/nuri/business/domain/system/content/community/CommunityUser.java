package nuri.business.domain.system.content.community;

import nuri.foundation.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "tb_cmnty_user_map")
public class CommunityUser extends BaseEntity implements Serializable {

    @EmbeddedId
    private CommunityUserId id;

    @Column(length = 1)
    private String mngrYn;

    @Column(length = 8)
    private String joinYmd;

    @Column(length = 8)
    private String whdwlYmd;

    @Column(length = 12)
    private String mbrSttsCd;

    @Column(length = 1)
    private String useYn;

    private CommunityUser(CommunityUserId id, String mngrYn, String joinYmd, String whdwlYmd, String mbrSttsCd, String useYn) {
        this.id = id;
        this.mngrYn = mngrYn;
        this.joinYmd = joinYmd;
        this.whdwlYmd = whdwlYmd;
        this.mbrSttsCd = mbrSttsCd;
        this.useYn = useYn;
    }

    @Builder
    public static CommunityUser create(CommunityUserId id, String mngrYn, String joinYmd, String whdwlYmd, String mbrSttsCd, String useYn) {
        return new CommunityUser(id, mngrYn, joinYmd, whdwlYmd, mbrSttsCd, useYn);
    }

    /** 가입 신청 → 회원. 상태 어휘는 {@link CommunityMemberStatus} 가 정본이다(DEC-OPS-043). */
    public void approve() {
        this.mbrSttsCd = CommunityMemberStatus.APPROVED.code();
    }

    public boolean isRequested() {
        return CommunityMemberStatus.REQUESTED.matches(this.mbrSttsCd);
    }

    public boolean isApproved() {
        return CommunityMemberStatus.APPROVED.matches(this.mbrSttsCd);
    }

    public boolean isWithdrawn() {
        return CommunityMemberStatus.WITHDRAWN.matches(this.mbrSttsCd);
    }

    /** 회원 → 탈퇴. 행은 남겨 가입·탈퇴 일자를 보존하며, 게시판 접근 판정은 회원({@code P})만 통과시킨다. */
    public void withdraw(String withdrawalYmd) {
        this.mbrSttsCd = CommunityMemberStatus.WITHDRAWN.code();
        this.useYn = "N";
        this.whdwlYmd = withdrawalYmd;
        this.mngrYn = "N";
    }

    /**
     * 탈퇴 → 가입 신청. 탈퇴한 사용자가 다시 가입하면 새 신청으로 시작한다 — 승인 없이 회원으로 되돌리지 않는다.
     * 복합 PK 라 새 행을 만들 수 없으므로 같은 행을 신청 상태로 되돌린다.
     */
    public void requestAgain(String joinYmd) {
        this.mbrSttsCd = CommunityMemberStatus.REQUESTED.code();
        this.useYn = "Y";
        this.joinYmd = joinYmd;
        this.whdwlYmd = null;
        this.mngrYn = "N";
    }
}
