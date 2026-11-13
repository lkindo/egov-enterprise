package nuri.business.domain.community;

import nuri.foundation.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import org.springframework.data.domain.Persistable;
import java.io.Serializable;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "tb_cmnty_user_map")
public class CommunityUser extends BaseEntity implements Serializable, Persistable<CommunityUserId> {

    // 할당형 복합키의 최초 저장은 INSERT다. 늦은 가입 요청이 기존 승인 행을 merge하지 않는다.
    @Transient
    private boolean newEntity = true;

    @Override
    public boolean isNew() {
        return newEntity;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        newEntity = false;
    }

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

    /**
     * 그 커뮤니티의 운영자인가(GAP-CMTY-001, DEC-OPS-416) — 승인된 회원({@code P})이면서 {@code mngrYn='Y'} 일 때만이다.
     * 탈퇴(W)·신청(A) 행에 남은 표시는 운영 권한이 아니다(탈퇴·재신청이 표시를 지우지만 직접 DML 행도 막는다).
     */
    public boolean isOperator() {
        return isApproved() && "Y".equals(this.mngrYn);
    }

    /** 승인된 회원을 운영자로 지정한다. 개설자 자동 지정과 운영자·관리자의 지정이 쓴다. */
    public void designateOperator() {
        this.mngrYn = "Y";
    }

    /** 운영자 표시를 해제한다. 마지막 운영자인지는 서비스가 커뮤니티 행을 잠근 뒤 판정한다. */
    public void releaseOperator() {
        this.mngrYn = "N";
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
