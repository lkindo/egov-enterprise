package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.springframework.data.domain.Persistable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 결재 참조자 한 사람(V2_123, 2026-10-04 결재 동선 개선 D4). 추가만 하고 고치지 않는다.
 *
 * <p>참조자는 결재하지 않고 읽기만 한다. 지정은 차수 단위로 한 행이다(2026-10-04 D4 개정 1) — 어느 차수에든 행이 있으면 그
 * 문서의 모든 상태·모든 차수를 읽고, 재상신에서 빠져도 이전 차수의 행은 남는다. 이전 차수 참조자를 다시 지정하면 그 차수의 새
 * 행이 생긴다. 기본 키의 지정 차수로 기안자가 그 차수에 지정했는지, 지금 차수의 참조자인지를 가른다. 지정한 사람은 두 축으로
 * 남긴다 — {@code chgUserIdntfr}(esntlId)는 기안자 지정·결재자 지정 판정과 이름 표시에 쓰고, {@code frstRgtrId}는 공통 감사
 * 계약대로 로그인 ID 다({@link InformalSanctionProcess} 와 같은 형태).
 *
 * <p>식별자가 요청 전에 정해지므로 {@link Persistable#isNew()} 를 참으로 두어 {@code save()} 가 병합이 아니라 INSERT 를
 * 하게 한다 — 같은 차수에 같은 사람을 두 번 넣으면 기본 키 충돌로 드러나고 조용히 덮이지 않는다(서비스는 이 차수에 이미
 * 참조자인 사람을 먼저 거른다).
 */
@Entity
@Immutable
@Table(name = "tb_ifml_atrz_rfpr")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctionReference implements Persistable<InformalSanctionReferenceId> {

    @EmbeddedId
    private InformalSanctionReferenceId id;

    /** 지정한 사람의 사용자 PK(esntlId). 문서의 신청자와 같으면 기안자 지정이다. */
    @Column(name = "chg_user_idntfr", nullable = false, length = 20, updatable = false)
    private String chgUserIdntfr;

    /** 공통 감사 계약의 로그인 ID. */
    @Column(name = "frst_rgtr_id", nullable = false, length = 20, updatable = false)
    private String frstRgtrId;

    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    /**
     * @param designatorId      지정한 사람의 esntlId(기안자 또는 지금 차례인 결재자)
     * @param designatorLoginId 지정한 사람의 로그인 ID(감사 컬럼)
     */
    public static InformalSanctionReference designate(InformalSanction sanction, String userId, String designatorId,
                                                      String designatorLoginId, LocalDateTime at) {
        InformalSanctionReference reference = new InformalSanctionReference();
        reference.id = new InformalSanctionReferenceId(Objects.requireNonNull(sanction.getIfmlAtrzSn()),
                Objects.requireNonNull(sanction.getAtrzCycl()), userId);
        reference.chgUserIdntfr = Objects.requireNonNull(designatorId);
        reference.frstRgtrId = Objects.requireNonNull(designatorLoginId);
        reference.crtDt = Objects.requireNonNull(at);
        return reference;
    }

    /** 지정된 차수(기본 키의 일부). */
    public BigDecimal getAtrzCycl() {
        return id.getAtrzCycl();
    }

    /** 이 문서의 기안자가 지정했는가 — 아니면 결재자가 더한 참조자다. */
    public boolean designatedBy(String applicantId) {
        return chgUserIdntfr.equals(applicantId);
    }

    /** 이 차수에 지정됐는가. */
    public boolean designatedIn(BigDecimal cycle) {
        return id.getAtrzCycl().compareTo(cycle) == 0;
    }

    @Override
    @Transient
    public boolean isNew() {
        return true;
    }
}
