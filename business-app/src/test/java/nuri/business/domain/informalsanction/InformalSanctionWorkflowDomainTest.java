package nuri.business.domain.informalsanction;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("다단계 결재 문서·차수·라인 도메인 계약")
class InformalSanctionWorkflowDomainTest {
    private static final LocalDateTime DECIDED_AT = LocalDateTime.of(2026, 9, 16, 10, 0);

    private InformalSanction document(String status) {
        return InformalSanction.builder().ifmlAtrzSn(7L).aplcntId("owner").aprvrId("first")
                .taskSeCd("TASK").reqYmd("20260916").aprvYn(status)
                .docTtl("이전 제목").docCn("이전 본문").build();
    }

    private InformalSanctionDetail line(boolean active) {
        return InformalSanctionDetail.create(new InformalSanctionDetailId(
                7L, BigDecimal.ONE, BigDecimal.ONE, "first"), ApprovalStageKind.AGREEMENT, active);
    }

    @ParameterizedTest
    @ValueSource(strings = {"R", "W"})
    @DisplayName("반려·회수 문서를 재상신하면 차수가 증가하고 이전 스냅샷은 보존된다")
    void resubmissionPreservesPreviousRevision(String status) {
        InformalSanction document = document(status);
        InformalSanctionHistory previous = InformalSanctionHistory.create(document);

        document.resubmit("NEXT", "20260917", "새 제목", "새 본문", "second");

        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.valueOf(2));
        assertThat(document.getAprvYn()).isEqualTo("A");
        assertThat(document.getAprvrId()).isEqualTo("second");
        assertThat(document.getAtrzDt()).isNull();
        assertThat(document.getRjctRsnCn()).isNull();
        assertThat(previous.getId().getAtrzCycl()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(previous.getAprvYn()).isEqualTo(status);
        assertThat(previous.getDocTtl()).isEqualTo("이전 제목");
        assertThat(previous.getDocCn()).isEqualTo("이전 본문");
        assertThat(previous.getTaskSeCd()).isEqualTo("TASK");
    }

    @ParameterizedTest
    @ValueSource(strings = {"A", "C"})
    @DisplayName("진행 중·승인 문서는 재상신할 수 없다")
    void resubmissionRejectsRequestedAndApprovedDocuments(String status) {
        InformalSanction document = document(status);

        assertThatThrownBy(() -> document.resubmit("NEXT", "20260917", "새 제목", "새 본문", "second"))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_STATE);
        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(document.getDocCn()).isEqualTo("이전 본문");
    }

    @Test
    @DisplayName("차수 물리 상한에 도달하면 재상신을 거절하고 내용을 보존한다")
    void rejectsRevisionOverflowWithoutMutation() {
        InformalSanction document = InformalSanction.builder().ifmlAtrzSn(7L)
                .atrzCycl(BigDecimal.valueOf(9_999_999)).aprvYn("R").docCn("이전 본문").build();

        assertThatThrownBy(() -> document.resubmit("NEXT", "20260917", "새 제목", "새 본문", "second"))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_STATE);
        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.valueOf(9_999_999));
        assertThat(document.getDocCn()).isEqualTo("이전 본문");
    }

    @Test
    @DisplayName("회수는 W·처리 시각을 남기며 같은 문서와 차수를 유지한다")
    void withdrawalPreservesDocumentIdentityAndRevision() {
        InformalSanction document = document("A");

        document.withdraw();

        assertThat(document.getIfmlAtrzSn()).isEqualTo(7L);
        assertThat(document.getAtrzCycl()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(document.getAprvYn()).isEqualTo("W");
        assertThat(document.getAtrzDt()).isNotNull();
        assertThat(document.getDocCn()).isEqualTo("이전 본문");
    }

    @Test
    @DisplayName("대기 라인은 활성화되기 전 승인할 수 없다")
    void waitingLineCannotBeDecidedBeforeActivation() {
        InformalSanctionDetail line = line(false);

        assertThatThrownBy(() -> line.decide(true, "의견", DECIDED_AT))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_STATE);
        assertThat(line.status()).isEqualTo(ApprovalStatus.WAITING);
        assertThat(line.getAtrzDt()).isNull();

        line.activate();
        line.decide(true, "의견", DECIDED_AT);
        assertThat(line.kind()).isEqualTo(ApprovalStageKind.AGREEMENT);
        assertThat(line.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(line.getAtrzOpnnCn()).isEqualTo("의견");
        assertThat(line.getAtrzDt()).isEqualTo(DECIDED_AT);
    }

    @Test
    @DisplayName("취소는 미처리 라인만 바꾸고 처리한 의견·시각은 보존한다")
    void cancellationPreservesDecisionsAndCancelsOnlyUndecidedLines() {
        InformalSanctionDetail approved = line(true);
        approved.decide(true, "동의", DECIDED_AT);
        InformalSanctionDetail waiting = line(false);
        InformalSanctionDetail active = line(true);

        approved.cancel();
        waiting.cancel();
        active.cancel();

        assertThat(approved.status()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(approved.getAtrzOpnnCn()).isEqualTo("동의");
        assertThat(approved.getAtrzDt()).isEqualTo(DECIDED_AT);
        assertThat(waiting.status()).isEqualTo(ApprovalStatus.CANCELLED);
        assertThat(active.status()).isEqualTo(ApprovalStatus.CANCELLED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    @DisplayName("라인 반려 사유가 비면 상태·의견·시각을 변경하지 않는다")
    void rejectionRequiresOpinionWithoutMutation(String opinion) {
        InformalSanctionDetail line = line(true);

        assertThatThrownBy(() -> line.decide(false, opinion, DECIDED_AT))
                .isInstanceOf(BusinessException.class).extracting("errorCode")
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(line.status()).isEqualTo(ApprovalStatus.ACTIVE);
        assertThat(line.getAtrzOpnnCn()).isNull();
        assertThat(line.getAtrzDt()).isNull();
    }
}
