package nuri.migration.validate.ledger;

import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TermLedgerLoaderTest {

    private static final String LEDGER = """
            schemaVersion: 2
            entries:
              - id: L1
                source: {table: legacy.legacy_user, column: END_YMD}
                target: {table: public.tb_user_info, column: end_ymd}
                term: {name: 종료일자, engAbbr: END_YMD, domain: 연월일C8}
                grade: EXACT
                status: CONFIRMED
                load: {transform: ymd8, nullify: [{violation: PLACEHOLDER_DATE, maxRows: 12}]}
                conformance:
                  rate: 99.6
                  transform: transform:ymd8
                  violations: [{type: PLACEHOLDER_DATE, rows: 12}, {type: INVALID_DATE, rows: 3}]
                  approvedExceptions: {maxRows: 3, reason: 원천 정정 대기, violations: [INVALID_DATE]}
                note: 자리표시 종료일은 종료일 없음으로 본다
                history:
                  - {to: REVIEWED, by: 검토자, at: "2026-10-01"}
                  - {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}
              - id: L2
                source: {table: legacy.legacy_user, column: PHOTO}
                target: {table: public.tb_user_info, column: photo}
                nonStandardTarget: {reason: 표준 용어가 없는 이진 컬럼}
                grade: UNKNOWN
                status: CONFIRMED
                load: {}
                history:
                  - {to: REVIEWED, by: 검토자, at: "2026-10-01"}
                  - {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}
            """;

    private final TermLedgerLoader loader = new TermLedgerLoader();

    @Test
    void aKeyWrittenTwiceIsRejectedBecauseOnlyTheLastValueWouldBeApproved() {
        // 검토자는 앞의 status(REVIEWED)를 읽는데 Jackson 은 뒤의 값(CONFIRMED)만 남긴다.
        String twice = LEDGER.replace("    status: CONFIRMED\n    load: {transform: ymd8",
                "    status: REVIEWED\n    status: CONFIRMED\n    load: {transform: ymd8");
        assertThat(twice).isNotEqualTo(LEDGER);

        assertThatThrownBy(() -> loader.load(twice)).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
    }

    @Test
    void readsAReviewedFormatTwoLedger() {
        TermLedger ledger = loader.load(LEDGER);

        assertThat(ledger.schemaVersion()).isEqualTo(2);
        assertThat(ledger.entries()).hasSize(2);
        TermLedger.Entry first = ledger.entries().getFirst();
        assertThat(first.term().engAbbr()).isEqualTo("END_YMD");
        assertThat(first.load()).isEqualTo(new TermLedger.Load("ymd8", null, null,
                List.of(new MappingSpec.Nullify(DomainViolation.PLACEHOLDER_DATE, 12L))));
        assertThat(first.conformance().rate()).isEqualByComparingTo(new BigDecimal("99.6"));
        assertThat(first.conformance().unmeasured()).isEmpty();
        assertThat(first.conformance().violations()).containsExactly(
                new TermLedger.ViolationCount("PLACEHOLDER_DATE", 12L), new TermLedger.ViolationCount("INVALID_DATE", 3L));
        assertThat(first.conformance().approvedExceptions())
                .isEqualTo(new TermLedger.ApprovedExceptions(3L, "원천 정정 대기", List.of("INVALID_DATE")));
        assertThat(first.history()).hasSize(2);
        TermLedger.Entry second = ledger.entries().get(1);
        assertThat(second.nonStandardTarget()).isEqualTo(new TermLedger.NonStandardTarget("표준 용어가 없는 이진 컬럼"));
        assertThat(second.load()).isEqualTo(new TermLedger.Load(null, null, null, List.of()));
        assertThat(second.term()).isNull();
        assertThat(new TermLedgerValidator().validate(ledger)).isEmpty();
    }

    @Test
    void routingFieldsAreRead() {
        TermLedger ledger = loader.load(LEDGER.replace("    grade: EXACT", "    mapping: user_main\n"
                + "    via: {mapping: orders, lookup: cust}\n    grade: EXACT"));

        assertThat(ledger.entries().getFirst().mapping()).isEqualTo("user_main");
        assertThat(ledger.entries().getFirst().via()).isEqualTo(new TermLedger.Via("orders", "cust"));
    }

    @Test
    void aFormatOneLedgerIsRejectedWithTheWayToMoveIt() {
        String formatOne = """
                schemaVersion: 1
                entries:
                  - id: L1
                    source: {table: legacy.legacy_user, column: USER_ID}
                    grade: EXACT
                    status: PROPOSED
                    conformance: {rate: 100, transform: null}
                """;

        assertThatThrownBy(() -> loader.load(formatOne))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(TermLedgerLoader.FORMAT_1)
                .hasMessageContaining("형식 1 은 더 이상 읽지 않습니다")
                .hasMessageContaining("schemaVersion: 2");
    }

    @Test
    void unknownFieldsMalformedTextAndEmptyFilesAreRejectedWithFixedMessages() {
        assertThatThrownBy(() -> loader.load(LEDGER.replace("grade: EXACT", "grade: EXACT\n    grde: X")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("load: {transform: ymd8,", "load: {transfrom: ymd8,")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("maxRows: 12}", "maxRows: 12, scope: all}")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("{type: INVALID_DATE, rows: 3}",
                "{type: INVALID_DATE, rows: 3, sample: x}"))).hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("violations: [INVALID_DATE]}",
                "violations: [INVALID_DATE], until: x}"))).hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("{reason: 표준 용어가 없는 이진 컬럼}",
                "{reason: 표준 용어가 없는 이진 컬럼, by: x}"))).hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load("entries: [")).hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load("")).hasMessage("용어 매핑 원장이 비어 있습니다");
    }

    @Test
    void countsAndCapsAreReadOnlyAsWholeNumbersAndViolationsOnlyByName() {
        assertThatThrownBy(() -> loader.load(LEDGER.replace("{maxRows: 3,", "{maxRows: 2.7,")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("rows: 12}", "rows: 12.5}")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("maxRows: 12}", "maxRows: 12.0}")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("{violation: PLACEHOLDER_DATE,", "{violation: 1,")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("schemaVersion: 2", "schemaVersion: 2.0")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
    }

    @Test
    void rawPersonalValuesOrCredentialsAnywhereStopTheLoad() {
        assertThatThrownBy(() -> loader.load(LEDGER.replace("note: 자리표시", "note: 예시 010-1234-5678 자리표시")))
                .hasMessage("용어 매핑 원장에 자격·개인정보로 보이는 값이 있습니다")
                .hasMessageNotContaining("010");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("reason: 원천 정정 대기", "reason: password=legacy")))
                .hasMessage("용어 매핑 원장에 자격·개인정보로 보이는 값이 있습니다");
    }
}
