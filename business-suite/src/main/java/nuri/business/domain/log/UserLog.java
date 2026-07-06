package nuri.business.domain.log;
import nuri.business.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import nuri.business.domain.user.entity.User;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

/**
 * 사용자 로그(통계) 엔티티 (tb_user_log)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 읽기 전용 연관 vnUserMaster 는 빌더 대상이 아니므로 팩토리에서 제외.
 */
@Entity
@Table(name = "tb_user_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(UserLogId.class)
public class UserLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dmnd_user_id", referencedColumnName = "esntl_id", insertable = false, updatable = false)
    private User vnUserMaster;

    @Id
    @Column(length = 8)
    private String ocrnYmd;

    @Id
    @Column(name = "dmnd_user_id", length = 20)
    private String dmndUserId;

    @Id
    @Column(length = 100)
    private String srvcNm;

    @Id
    @Column(length = 100)
    private String mthdNm;

    private Integer crtCnt;

    private Integer mdfcnCnt;

    private Integer inqCnt;

    private Integer delCnt;

    private Integer otptCnt;

    private Integer errCnt;

    private UserLog(String ocrnYmd, String dmndUserId, String srvcNm, String mthdNm,
            Integer crtCnt, Integer mdfcnCnt, Integer inqCnt, Integer delCnt,
            Integer otptCnt, Integer errCnt) {
        this.ocrnYmd = ocrnYmd;
        this.dmndUserId = dmndUserId;
        this.srvcNm = srvcNm;
        this.mthdNm = mthdNm;
        this.crtCnt = crtCnt;
        this.mdfcnCnt = mdfcnCnt;
        this.inqCnt = inqCnt;
        this.delCnt = delCnt;
        this.otptCnt = otptCnt;
        this.errCnt = errCnt;
    }

    @Builder
    public static UserLog create(String ocrnYmd, String dmndUserId, String srvcNm, String mthdNm,
            Integer crtCnt, Integer mdfcnCnt, Integer inqCnt, Integer delCnt,
            Integer otptCnt, Integer errCnt) {
        return new UserLog(ocrnYmd, dmndUserId, srvcNm, mthdNm, crtCnt, mdfcnCnt, inqCnt, delCnt, otptCnt, errCnt);
    }
}
