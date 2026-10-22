package nuri.business.domain.board;

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
 * 게시판 변경 이력(V2_139, ADR-0040 결정 9). 운영 처리(설정·사용 여부·게시 기간·고정)를 바뀐 항목마다 한 건씩, 변경과 같은
 * 트랜잭션에서 추가하며 고치지 않는다. 공통코드 변경 이력({@code CommonCodeChange})과 같은 용어·형태다. 게시판을 영구 삭제해도
 * 남도록 게시판·게시글을 외래 키로 잇지 않는다.
 */
@Entity
@Immutable
@Table(name = "tb_bbs_chg_hstry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BoardChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bbs_chg_hstry_sn", nullable = false, updatable = false)
    private Long bbsChgHstrySn;

    /** BBS(게시판)·PST(게시글). */
    @Column(name = "chg_trgt_type_cd", nullable = false, length = 12, updatable = false)
    private String chgTrgtTypeCd;
    /** SETTING(설정)·USE(사용 여부)·PERIOD(게시 기간)·PIN(고정)·UNPIN(고정 해제). */
    @Column(name = "chg_type_cd", nullable = false, length = 12, updatable = false)
    private String chgTypeCd;
    @Column(name = "bbs_id", nullable = false, length = 20, updatable = false)
    private String bbsId;
    /** 게시글 행만 있다. */
    @Column(name = "pst_sn", updatable = false)
    private Long pstSn;
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
    public static BoardChange create(String chgTrgtTypeCd, String chgTypeCd, String bbsId, Long pstSn,
            String chgArtclNm, String chgBfrCn, String chgAftrCn, String chgUserIdntfr,
            String frstRgtrId, LocalDateTime crtDt) {
        BoardChange change = new BoardChange();
        change.chgTrgtTypeCd = Objects.requireNonNull(chgTrgtTypeCd);
        change.chgTypeCd = Objects.requireNonNull(chgTypeCd);
        change.bbsId = Objects.requireNonNull(bbsId);
        change.pstSn = pstSn;
        change.chgArtclNm = Objects.requireNonNull(chgArtclNm);
        change.chgBfrCn = chgBfrCn;
        change.chgAftrCn = chgAftrCn;
        change.chgUserIdntfr = chgUserIdntfr;
        change.frstRgtrId = Objects.requireNonNull(frstRgtrId);
        change.crtDt = Objects.requireNonNull(crtDt);
        return change;
    }
}
