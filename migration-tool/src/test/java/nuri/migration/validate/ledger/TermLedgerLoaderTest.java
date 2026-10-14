package nuri.migration.validate.ledger;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TermLedgerLoaderTest {

    private static final String LEDGER = """
            schemaVersion: 1
            entries:
              - id: L1
                source: {table: legacy.legacy_user, column: USER_ID}
                target: {table: public.tb_user_info, column: user_id}
                term: {name: 사용자ID, engAbbr: USER_ID, domain: ID V20}
                grade: EXACT
                status: CONFIRMED
                conformance: {rate: 100, transform: null}
                history:
                  - {to: REVIEWED, by: 검토자, at: "2026-10-01"}
                  - {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}
            """;

    private final TermLedgerLoader loader = new TermLedgerLoader();

    @Test
    void readsAReviewedYamlLedger() {
        TermLedger ledger = loader.load(LEDGER);

        assertThat(ledger.schemaVersion()).isEqualTo(1);
        assertThat(ledger.entries()).singleElement().satisfies(entry -> {
            assertThat(entry.term().engAbbr()).isEqualTo("USER_ID");
            assertThat(entry.conformance().rate()).isEqualByComparingTo(BigDecimal.valueOf(100));
            assertThat(entry.history()).hasSize(2);
        });
        assertThat(new TermLedgerValidator().validate(ledger)).isEmpty();
    }

    @Test
    void unknownFieldsMalformedTextAndEmptyFilesAreRejectedWithFixedMessages() {
        assertThatThrownBy(() -> loader.load(LEDGER.replace("grade: EXACT", "grade: EXACT\n    grde: X")))
                .hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load("entries: [")).hasMessage("용어 매핑 원장 형식이 맞지 않습니다");
        assertThatThrownBy(() -> loader.load("")).hasMessage("용어 매핑 원장이 비어 있습니다");
    }

    @Test
    void rawPersonalValuesOrCredentialsAnywhereStopTheLoad() {
        assertThatThrownBy(() -> loader.load(LEDGER.replace("history:", "note: 예시 010-1234-5678\n    history:")))
                .hasMessage("용어 매핑 원장에 자격·개인정보로 보이는 값이 있습니다")
                .hasMessageNotContaining("010");
        assertThatThrownBy(() -> loader.load(LEDGER.replace("history:", "note: password=legacy\n    history:")))
                .hasMessage("용어 매핑 원장에 자격·개인정보로 보이는 값이 있습니다");
    }
}
