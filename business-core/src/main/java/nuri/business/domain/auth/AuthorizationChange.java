package nuri.business.domain.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

/** 권한 변경의 원자적 delta. 대상이 삭제되어도 이력은 유지하며 수정용 필드를 갖지 않는다. */
@Entity
@Immutable
@Table(name = "tb_authrt_chg_hstry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthorizationChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "authrt_chg_hstry_sn", nullable = false, updatable = false)
    private Long authrtChgHstrySn;

    @Column(name = "dmnd_idntfr", nullable = false, length = 50, updatable = false)
    private String dmndIdntfr;
    @Column(name = "plcy_ver_no", nullable = false, length = 64, updatable = false)
    private String plcyVerNo;
    @Column(name = "chg_trgt_type_cd", nullable = false, length = 12, updatable = false)
    private String chgTrgtTypeCd;
    @Column(name = "chg_type_cd", nullable = false, length = 12, updatable = false)
    private String chgTypeCd;
    @Column(name = "authrt_cd", nullable = false, length = 20, updatable = false)
    private String authrtCd;
    @Column(name = "scrty_dcsn_trgt_id", length = 20, updatable = false)
    private String scrtyDcsnTrgtId;
    @Column(name = "authrt_type_cd", length = 12, updatable = false)
    private String authrtTypeCd;
    @Column(name = "authrt_grnt_cd", length = 20, updatable = false)
    private String authrtGrntCd;
    @Column(name = "chg_artcl_nm", nullable = false, length = 100, updatable = false)
    private String chgArtclNm;
    @Column(name = "chg_bfr_cn", length = 4000, updatable = false)
    private String chgBfrCn;
    @Column(name = "chg_aftr_cn", length = 4000, updatable = false)
    private String chgAftrCn;
    @Column(name = "chg_rsn", length = 4000, updatable = false)
    private String chgRsn;
    /** 사건 행위자의 사용자 PK(esntlId). */
    @Column(name = "chg_user_idntfr", length = 20, updatable = false)
    private String chgUserIdntfr;
    /** 공통 감사 계약의 로그인 ID. */
    @Column(name = "frst_rgtr_id", nullable = false, length = 20, updatable = false)
    private String frstRgtrId;
    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    @Builder
    public static AuthorizationChange create(String dmndIdntfr, String plcyVerNo, String chgTrgtTypeCd,
            String chgTypeCd, String authrtCd, String scrtyDcsnTrgtId, String authrtTypeCd, String authrtGrntCd,
            String chgArtclNm, String chgBfrCn, String chgAftrCn, String chgRsn, String chgUserIdntfr,
            String frstRgtrId, LocalDateTime crtDt) {
        AuthorizationChange change = new AuthorizationChange();
        change.dmndIdntfr = Objects.requireNonNull(dmndIdntfr);
        change.plcyVerNo = Objects.requireNonNull(plcyVerNo);
        change.chgTrgtTypeCd = Objects.requireNonNull(chgTrgtTypeCd);
        change.chgTypeCd = Objects.requireNonNull(chgTypeCd);
        change.authrtCd = Objects.requireNonNull(authrtCd);
        change.scrtyDcsnTrgtId = scrtyDcsnTrgtId;
        change.authrtTypeCd = authrtTypeCd;
        change.authrtGrntCd = authrtGrntCd;
        change.chgArtclNm = Objects.requireNonNull(chgArtclNm);
        change.chgBfrCn = chgBfrCn;
        change.chgAftrCn = chgAftrCn;
        change.chgRsn = chgRsn;
        change.chgUserIdntfr = chgUserIdntfr;
        change.frstRgtrId = Objects.requireNonNull(frstRgtrId);
        change.crtDt = Objects.requireNonNull(crtDt);
        return change;
    }
}
