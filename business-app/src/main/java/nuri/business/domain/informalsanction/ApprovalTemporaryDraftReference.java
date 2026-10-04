package nuri.business.domain.informalsanction;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

import java.util.Objects;

/**
 * 임시저장한 기안의 참조자 한 사람(V2_123, 2026-10-04 D4). 임시저장 결재선({@link ApprovalTemporaryDraftLine})과 같이
 * 저장할 때마다 지운 뒤 다시 넣는 쓰기 모델이라 감사 4종(BaseEntity)이다. 참조자 자격(사용 중·결재 조회 권한)은 저장할 때
 * 보지 않고 다시 열 때 지금 자격으로 판정한다. 임시저장이 지워지면 함께 지워진다(ON DELETE CASCADE).
 */
@Entity
@Table(name = "tb_ifml_atrz_tmpr_strg_rfpr")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalTemporaryDraftReference extends BaseEntity {
    @EmbeddedId
    private ApprovalTemporaryDraftReferenceId id;

    public static ApprovalTemporaryDraftReference create(ApprovalTemporaryDraftReferenceId id) {
        ApprovalTemporaryDraftReference reference = new ApprovalTemporaryDraftReference();
        reference.id = Objects.requireNonNull(id);
        return reference;
    }
}
