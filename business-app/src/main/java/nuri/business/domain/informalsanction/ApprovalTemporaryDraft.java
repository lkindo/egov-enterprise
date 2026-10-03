package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 상신하지 않은 결재 기안의 임시저장(V2_122, 2026-10-03 결재 동선 개선 D3).
 *
 * <p>결재 표와 따로 둔다 — 대기함·알림·통계·결재선 제안은 결재 표만 읽으므로 임시저장이 섞이지 않는다. 기안자
 * 본인({@code aplcntId}, esntlId)만 열고 고친다. 결재선은 {@link ApprovalTemporaryDraftLine} 이 단계·사람마다 한 행으로
 * 들고, 이 엔티티와 연관을 맺지 않는다(번호로만 잇는다). 결재선만 바뀌어도 버전이 오르도록 저장할 때마다 수정 시각을
 * 고친다 — 같은 버전을 들고 있는 다른 화면이 옛 내용으로 덮지 못하게 한다.
 */
@Entity
@Table(name = "tb_ifml_atrz_tmpr_strg")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalTemporaryDraft extends BaseEntity {

    @Version
    private Integer version;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ifml_atrz_tmpr_strg_sn")
    private Long ifmlAtrzTmprStrgSn;

    /** 기안자 사용자 PK(esntlId). 감사 컬럼(로그인 ID)과 대조하지 않는다. */
    @Column(length = 20, nullable = false, updatable = false)
    private String aplcntId;

    @Column(length = 12)
    private String taskSeCd;

    @Column(length = 256)
    private String docTtl;

    @Column(length = 4000)
    private String docCn;

    public static ApprovalTemporaryDraft create(String aplcntId, String taskSeCd, String docTtl, String docCn) {
        ApprovalTemporaryDraft draft = new ApprovalTemporaryDraft();
        draft.aplcntId = Objects.requireNonNull(aplcntId);
        draft.taskSeCd = taskSeCd;
        draft.docTtl = docTtl;
        draft.docCn = docCn;
        return draft;
    }

    /** 내용을 통째로 바꾼다. 바뀐 것이 없어도 수정 시각을 고쳐 버전을 올린다(결재선만 바뀐 저장도 새 버전이다). */
    public void revise(String taskSeCd, String docTtl, String docCn) {
        this.taskSeCd = taskSeCd;
        this.docTtl = docTtl;
        this.docCn = docCn;
        this.mdfcnDt = LocalDateTime.now();
    }
}
