package nuri.business.domain.code;

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

/**
 * 공통코드(분류·그룹·상세) 변경 이력(2026-09-27 DIP B5 F11). 변경과 같은 트랜잭션에서 한 건씩 추가하며 고치지 않는다.
 * 권한 변경 이력({@code AuthorizationChange})과 같은 용어·형태다.
 */
@Entity
@Immutable
@Table(name = "tb_com_cd_chg_hstry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommonCodeChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "com_cd_chg_hstry_sn", nullable = false, updatable = false)
    private Long comCdChgHstrySn;

    /** CLSF(분류)·CODE(그룹)·DTL(상세). */
    @Column(name = "chg_trgt_type_cd", nullable = false, length = 12, updatable = false)
    private String chgTrgtTypeCd;
    /** ADD(등록)·UPDATE(수정)·REMOVE(삭제 — 사용 안 함으로 바꾼다). */
    @Column(name = "chg_type_cd", nullable = false, length = 12, updatable = false)
    private String chgTypeCd;
    @Column(name = "clsf_cd", length = 12, updatable = false)
    private String clsfCd;
    @Column(name = "cd_id", length = 20, updatable = false)
    private String cdId;
    @Column(name = "dtl_cd", length = 12, updatable = false)
    private String dtlCd;
    @Column(name = "chg_artcl_nm", nullable = false, length = 100, updatable = false)
    private String chgArtclNm;
    @Column(name = "chg_bfr_cn", length = 4000, updatable = false)
    private String chgBfrCn;
    @Column(name = "chg_aftr_cn", length = 4000, updatable = false)
    private String chgAftrCn;
    /** 사건 행위자의 사용자 PK(esntlId). */
    @Column(name = "chg_user_idntfr", length = 20, updatable = false)
    private String chgUserIdntfr;
    /** 공통 감사 계약의 로그인 ID. */
    @Column(name = "frst_rgtr_id", nullable = false, length = 20, updatable = false)
    private String frstRgtrId;
    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    @Builder
    public static CommonCodeChange create(String chgTrgtTypeCd, String chgTypeCd, String clsfCd, String cdId,
            String dtlCd, String chgArtclNm, String chgBfrCn, String chgAftrCn, String chgUserIdntfr,
            String frstRgtrId, LocalDateTime crtDt) {
        CommonCodeChange change = new CommonCodeChange();
        change.chgTrgtTypeCd = Objects.requireNonNull(chgTrgtTypeCd);
        change.chgTypeCd = Objects.requireNonNull(chgTypeCd);
        change.clsfCd = clsfCd;
        change.cdId = cdId;
        change.dtlCd = dtlCd;
        change.chgArtclNm = Objects.requireNonNull(chgArtclNm);
        change.chgBfrCn = chgBfrCn;
        change.chgAftrCn = chgAftrCn;
        change.chgUserIdntfr = chgUserIdntfr;
        change.frstRgtrId = Objects.requireNonNull(frstRgtrId);
        change.crtDt = Objects.requireNonNull(crtDt);
        return change;
    }
}
