package nuri.migration.validate.ledger;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.validate.ledger.TermLedger.ApprovedExceptions;
import nuri.migration.validate.ledger.TermLedger.Archive;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedger.Transition;
import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TermLedgerValidatorTest {

    private static final StandardTerm USER_ID = new StandardTerm("사용자ID", "USER_ID", "ID V20");
    private static final List<Transition> CONFIRMED_PATH = List.of(
            new Transition("REVIEWED", "검토자", "2026-10-01"),
            new Transition("CONFIRMED", "업무담당", "2026-10-02"));

    private final TermLedgerValidator validator = new TermLedgerValidator();

    @Test
    void aConfirmedRowWithAHumanPathFullConformanceAndMatchingTargetPasses() {
        TermLedger ledger = ledger(confirmed("L1", "legacy.legacy_user", "USER_ID", "public.tb_user_info", "user_id"));

        assertThat(validator.validate(ledger)).isEmpty();
        assertThat(validator.coverage(ledger, mapping())).isEmpty();
        assertThat(validator.live(ledger, Map.of("USER_ID", new StandardTermRecord("사용자ID", "ID V20", false))))
                .isEmpty();
        assertThat(validator.confirmedTermsBySchema(ledger)).isEqualTo(Map.of("public", Set.of("USER_ID")));
    }

    @Test
    void shapeErrorsNameTheRowWithoutRepeatingContent() {
        Entry noSource = new Entry("L2", null, null, null, "EXACT", "PROPOSED", null, null, null, List.of());
        Entry badGrade = new Entry("L3", new ColumnRef("t", "c"), null, null, "GUESS", "PROPOSED", null, null, null,
                List.of());
        Entry badStatus = new Entry("L4", new ColumnRef("t", "d"), null, null, "EXACT", "DONE", null, null, null,
                List.of());
        Entry badId = new Entry("bad id", new ColumnRef("t", "e"), null, null, "EXACT", "PROPOSED", null, null,
                null, List.of());
        Entry duplicateId = new Entry("L3", new ColumnRef("t", "f"), null, null, "EXACT", "PROPOSED", null, null,
                null, List.of());
        Entry duplicateSource = new Entry("L6", new ColumnRef("T", "C"), null, null, "EXACT", "PROPOSED", null,
                null, null, List.of());

        List<String> errors = validator.validate(new TermLedger(2,
                List.of(noSource, badGrade, badStatus, badId, duplicateId, duplicateSource)));

        assertThat(errors).containsExactly(
                "원장 schemaVersion 은 1 이어야 합니다",
                "L2: source 표·컬럼이 필요합니다",
                "L3: grade 는 EXACT·SYNONYM·INFERRED·UNKNOWN 중 하나여야 합니다",
                "L4: 알 수 없는 상태입니다",
                "원장 행 ID 형식이 맞지 않습니다",
                "L3: 같은 ID 가 두 번 있습니다",
                "L6: 같은 소스 컬럼(T.C)이 두 행에 있습니다");
    }

    @Test
    void historyMustBeALegalDatedHumanPathEndingAtTheStatus() {
        Entry skip = entry("S1", "CONFIRMED", List.of(new Transition("CONFIRMED", "업무담당", "2026-10-02")));
        Entry tool = entry("S2", "CONFIRMED", List.of(new Transition("REVIEWED", "검토자", "2026-10-01"),
                new Transition("CONFIRMED", "Term-Suggest", "2026-10-02")));
        Entry backwards = entry("S3", "REVIEWED", List.of(new Transition("REVIEWED", "검토자", "2026-10-03"),
                new Transition("PROPOSED", "검토자", "2026-10-02"), new Transition("REVIEWED", "검토자", "2026-10-04")));
        Entry noActor = entry("S4", "REVIEWED", List.of(new Transition("REVIEWED", " ", "2026-02-30")));
        Entry mismatch = entry("S5", "REVIEWED", List.of());
        Entry reopened = entry("S6", "REVIEWED", List.of(new Transition("REVIEWED", "a", "2026-10-01"),
                new Transition("REJECTED", "a", "2026-10-01"), new Transition("PROPOSED", "a", "2026-10-01"),
                new Transition("REVIEWED", "a", "2026-10-01")));

        List<String> errors = validator.validate(ledger(skip, tool, backwards, noActor, mismatch, reopened));

        assertThat(errors).containsExactly(
                "S1: PROPOSED 에서 CONFIRMED 로 갈 수 없습니다",
                "S2: CONFIRMED 는 사람이 정해야 합니다(도구가 기록할 수 없습니다)",
                "S3: 전이 날짜가 앞 전이보다 이릅니다",
                "S4: REVIEWED 전이에 처리자(by)가 필요합니다",
                "S4: REVIEWED 전이 날짜(at)는 yyyy-MM-dd 여야 합니다",
                "S5: 전이 이력의 마지막 상태(PROPOSED)가 status(REVIEWED)와 다릅니다");
    }

    @Test
    void eachDecisionStateRequiresItsOwnEvidence() {
        Entry noTerm = new Entry("D1", new ColumnRef("t", "a"), new ColumnRef("p.x", "a"), null, "EXACT",
                "CONFIRMED", new Conformance(BigDecimal.valueOf(100), null, null), null, null, CONFIRMED_PATH);
        Entry wrongColumn = new Entry("D2", new ColumnRef("t", "b"), new ColumnRef("p.x", "other"), USER_ID,
                "UNKNOWN", "CONFIRMED", new Conformance(BigDecimal.valueOf(100), null, null), null, null,
                CONFIRMED_PATH);
        Entry partial = new Entry("D3", new ColumnRef("t", "c"), new ColumnRef("p.x", "user_id"), USER_ID,
                "INFERRED", "CONFIRMED", new Conformance(new BigDecimal("99.5"), "ymd8", null), null, null,
                CONFIRMED_PATH);
        Entry excepted = new Entry("D4", new ColumnRef("t", "d"), new ColumnRef("p.x", "user_id"), USER_ID,
                "INFERRED", "CONFIRMED", new Conformance(new BigDecimal("99.5"), "ymd8",
                new ApprovedExceptions(3L, "원천 정정 대기")), null, null, CONFIRMED_PATH);
        Entry noRate = new Entry("D5", new ColumnRef("t", "e"), new ColumnRef("p.x", "user_id"), USER_ID,
                "EXACT", "CONFIRMED", new Conformance(new BigDecimal("101"), null, null), null, null,
                CONFIRMED_PATH);
        Entry ignore = new Entry("D6", new ColumnRef("t", "f"), null, null, "UNKNOWN", "APPROVED_IGNORE", null,
                null, " ", List.of(new Transition("REVIEWED", "a", "2026-10-01"),
                new Transition("APPROVED_IGNORE", "b", "2026-10-02")));
        Entry archive = new Entry("D7", new ColumnRef("t", "g"), null, null, "UNKNOWN", "ARCHIVE", null,
                new Archive("2027/01/01"), null, List.of(new Transition("REVIEWED", "a", "2026-10-01"),
                new Transition("ARCHIVE", "b", "2026-10-02")));
        Entry register = new Entry("D8", new ColumnRef("t", "h"), null, null, "INFERRED",
                "REGISTRATION_REQUESTED", null, null, null, List.of(new Transition("REVIEWED", "a", "2026-10-01"),
                new Transition("REGISTRATION_REQUESTED", "b", "2026-10-02")));
        Entry archived = new Entry("D9", new ColumnRef("t", "i"), null, null, "UNKNOWN", "ARCHIVE", null,
                new Archive("2027-01-01"), null, List.of(new Transition("REVIEWED", "a", "2026-10-01"),
                new Transition("ARCHIVE", "b", "2026-10-02")));

        List<String> errors = validator.validate(
                ledger(noTerm, wrongColumn, partial, excepted, noRate, ignore, archive, register, archived));

        assertThat(errors).containsExactly(
                "D1: 확정에는 표준 용어(이름·영문약어·도메인)가 필요합니다",
                "D2: 대상 컬럼(other)이 표준 영문약어(USER_ID)와 다릅니다",
                "D2: 근거가 없는(UNKNOWN) 행은 확정할 수 없습니다",
                "D3: 적합률이 100 이 아니면 승인된 예외(행 수 상한·사유)가 필요합니다",
                "D5: 확정에는 0~100 의 적합률(conformance.rate)이 필요합니다",
                "D6: 이관 제외에는 사유(note)가 필요합니다",
                "D7: 외부 보관에는 보존 기한(archive.retainUntil, yyyy-MM-dd)이 필요합니다",
                "D8: 표준 등록 요청에는 요청할 용어 이름이 필요합니다");
    }

    @Test
    void everyMappedSourceColumnNeedsAConfirmedRowForTheSameTarget() {
        Entry confirmed = confirmed("C1", "legacy.legacy_user", "USER_ID", "public.tb_user_info", "user_id");
        Entry reviewed = new Entry("C2", new ColumnRef("legacy.legacy_user", "USER_NM"), null, null, "EXACT",
                "REVIEWED", null, null, null, List.of(new Transition("REVIEWED", "a", "2026-10-01")));
        Entry elsewhere = confirmed("C3", "legacy.legacy_user", "REG_DT", "public.tb_other", "reg_dt");
        MappingSpec mapping = new MappingSpec(null, null, List.of(new TableMapping(
                "LEGACY.LEGACY_USER", "public.tb_user_info", null, "USER_ID", "user_id",
                List.of(new ColumnMapping("user_id", "USER_ID", null, null, null, null, null),
                        new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null),
                        new ColumnMapping("REG_DT", "reg_dt", null, null, null, null, null),
                        new ColumnMapping("ETC", "etc", null, null, null, null, null),
                        new ColumnMapping(null, "use_yn", null, null, null, null, "Y")),
                null)), Map.of());

        assertThat(validator.coverage(ledger(confirmed, reviewed, elsewhere), mapping)).containsExactly(
                "LEGACY.LEGACY_USER.USER_NM: 원장 행 C2 이 확정되지 않았습니다(REVIEWED)",
                "LEGACY.LEGACY_USER.REG_DT: 원장 행 C3 의 대상과 mapping 의 대상(public.tb_user_info.reg_dt)이 다릅니다",
                "LEGACY.LEGACY_USER.ETC: 원장에 없는 매핑입니다");
    }

    @Test
    void confirmedTermsAreComparedWithLiveMetaAndDeprecatedTermsAreRejected() {
        Entry missing = confirmed("M1", "s.t", "A", "public.x", "user_id");
        Entry renamed = new Entry("M2", new ColumnRef("s.t", "B"), new ColumnRef("app.x", "user_id"), USER_ID,
                "EXACT", "CONFIRMED", new Conformance(BigDecimal.valueOf(100), null, null), null, null,
                CONFIRMED_PATH);
        Entry proposed = new Entry("M3", new ColumnRef("s.t", "C"), null, new StandardTerm("없음", "NONE", "X"),
                "EXACT", "PROPOSED", null, null, null, List.of());

        assertThat(validator.live(ledger(missing), Map.of())).containsExactly(
                "M1: 표준 용어 USER_ID 가 live 메타에 없습니다");
        assertThat(validator.live(ledger(renamed, proposed),
                Map.of("USER_ID", new StandardTermRecord("사용자아이디", "ID V30", true)))).containsExactly(
                "M2: 표준 용어 이름이 live 메타(사용자아이디)와 다릅니다",
                "M2: 표준 도메인이 live 메타(ID V30)와 다릅니다",
                "M2: 표준 용어 USER_ID 는 폐기됐습니다");
        assertThat(validator.confirmedTermsBySchema(ledger(missing, renamed, proposed)))
                .isEqualTo(Map.of("public", Set.of("USER_ID"), "app", Set.of("USER_ID")));
    }

    private static MappingSpec mapping() {
        return new MappingSpec(null, null, List.of(new TableMapping("legacy.legacy_user", "public.tb_user_info",
                null, "USER_ID", "user_id",
                List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)), null)), Map.of());
    }

    private static Entry confirmed(String id, String sourceTable, String sourceColumn, String targetTable,
                                   String targetColumn) {
        return new Entry(id, new ColumnRef(sourceTable, sourceColumn), new ColumnRef(targetTable, targetColumn),
                USER_ID, "EXACT", "CONFIRMED", new Conformance(BigDecimal.valueOf(100), null, null), null, null,
                CONFIRMED_PATH);
    }

    private static Entry entry(String id, String status, List<Transition> history) {
        return new Entry(id, new ColumnRef("t", id), new ColumnRef("p.x", "user_id"), USER_ID, "EXACT", status,
                new Conformance(BigDecimal.valueOf(100), null, null), null, null, history);
    }

    private static TermLedger ledger(Entry... entries) {
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, new ArrayList<>(List.of(entries)));
    }
}
