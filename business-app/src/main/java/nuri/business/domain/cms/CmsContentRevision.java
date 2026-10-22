package nuri.business.domain.cms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 콘텐츠 게시본(ADR-0039). 게시할 때마다 한 행을 더하고 고치거나 지우지 않는다 — DB 트리거가 수정·삭제를 거부한다.
 * 수정자 컬럼이 없는 추가 전용 이력이라 감사 두 컬럼을 서비스가 직접 채운다(권한 변경 이력과 같은 형태).
 */
@Entity
@Immutable
@Table(name = "tb_cms_conts_rvsn", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tb_cms_conts_rvsn_conts_sn_conts_rvsn_sn", columnNames = {"conts_sn", "conts_rvsn_sn"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsContentRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "conts_rvsn_sn", nullable = false, updatable = false)
    private Long contsRvsnSn;

    @Column(name = "conts_sn", nullable = false, updatable = false)
    private Long contsSn;

    @Column(name = "conts_ttl", nullable = false, length = 256, updatable = false)
    private String contsTtl;

    @Column(name = "conts_expln", length = 4000, updatable = false)
    private String contsExpln;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conts_doc_cn", nullable = false, updatable = false)
    private String contsDocCn;

    /** 게시자가 남긴 변경 설명. */
    @Column(name = "rvsn_rsn", length = 4000, updatable = false)
    private String rvsnRsn;

    /** 게시한 사람(공통 감사 계약의 로그인 ID). */
    @Column(name = "frst_rgtr_id", length = 20, updatable = false)
    private String frstRgtrId;

    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    public static CmsContentRevision create(Long contsSn, String contsTtl, String contsExpln, String contsDocCn,
            String rvsnRsn, String frstRgtrId, LocalDateTime crtDt) {
        CmsContentRevision revision = new CmsContentRevision();
        revision.contsSn = Objects.requireNonNull(contsSn);
        revision.contsTtl = Objects.requireNonNull(contsTtl);
        revision.contsExpln = contsExpln;
        revision.contsDocCn = Objects.requireNonNull(contsDocCn);
        revision.rvsnRsn = rvsnRsn;
        revision.frstRgtrId = frstRgtrId;
        revision.crtDt = Objects.requireNonNull(crtDt);
        return revision;
    }
}
