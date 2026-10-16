package nuri.business.domain.informalsanction;

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
import nuri.foundation.domain.common.BaseEntity;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 나의 결재선 — 기안자가 이름을 붙여 저장해 둔 개인 결재선(V2_129, 2026-10-16 결재 동선 개선 D2).
 *
 * <p>결재 표와 따로 둔다 — 대기함·알림·통계·결재선 제안은 결재 표만 읽으므로 저장한 결재선이 섞이지 않는다. 주인
 * 본인({@code userId}, esntlId)만 열고 고친다. 단계와 결재자는 {@link ApprovalSavedLineApprover} 가 단계·사람마다 한 행으로
 * 들고, 이 엔티티와 연관을 맺지 않는다(번호로만 잇는다). 같은 주인의 결재선 이름은 겹치지 않는다 — DB 유니크와 같은 제약을
 * 여기 둔다(헌법 제6조 7항).
 */
@Entity
@Table(name = "tb_ifml_atrz_indv_apln",
        uniqueConstraints = @UniqueConstraint(name = "uk_tb_ifml_atrz_indv_apln_user_id_apln_nm",
                columnNames = {"user_id", "apln_nm"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalSavedLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ifml_atrz_indv_apln_sn")
    private Long ifmlAtrzIndvAplnSn;

    /** 결재선 주인의 사용자 PK(esntlId). 감사 컬럼(로그인 ID)과 대조하지 않는다. */
    @Column(name = "user_id", length = 20, nullable = false, updatable = false)
    private String userId;

    @Column(name = "apln_nm", length = 200, nullable = false)
    private String aplnNm;

    public static ApprovalSavedLine create(String userId, String aplnNm) {
        ApprovalSavedLine line = new ApprovalSavedLine();
        line.userId = Objects.requireNonNull(userId);
        line.aplnNm = Objects.requireNonNull(aplnNm);
        return line;
    }

    /** 이름과 결재선을 통째로 바꾼다. 결재선 행만 바뀌어도 수정 시각을 고친다 — 목록이 '마지막으로 고친 때' 를 말한다. */
    public void revise(String aplnNm) {
        this.aplnNm = Objects.requireNonNull(aplnNm);
        this.mdfcnDt = LocalDateTime.now();
    }
}
