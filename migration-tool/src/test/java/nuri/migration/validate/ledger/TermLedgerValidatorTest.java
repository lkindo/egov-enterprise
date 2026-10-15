package nuri.migration.validate.ledger;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.validate.ledger.TermLedger.ApprovedExceptions;
import nuri.migration.validate.ledger.TermLedger.Archive;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;
import nuri.migration.validate.ledger.TermLedger.NonStandardTarget;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedger.Transition;
import nuri.migration.validate.ledger.TermLedger.Via;
import nuri.migration.validate.ledger.TermLedger.ViolationCount;
import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;
import nuri.migration.validate.ledger.TermLedgerValidator.TermKey;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** 원장 형식 2 의 정적 검사·coverage·codemap·live 대조(ADR-0029 L3a-2, DEC-OPS-317 U1·U3). */
class TermLedgerValidatorTest {

    private static final StandardTerm USER_ID = new StandardTerm("사용자ID", "USER_ID", "ID V20");
    private static final StandardTerm USER_NM = new StandardTerm("사용자명", "USER_NM", "명V100");
    private static final StandardTerm END_YMD = new StandardTerm("종료일자", "END_YMD", "연월일C8");
    private static final StandardTerm REG_DT = new StandardTerm("등록일시", "REG_DT", "연월일시분초C14");
    private static final StandardTerm REG_TM = new StandardTerm("등록시각", "REG_TM", "시분초C6");
    private static final StandardTerm USE_YN = new StandardTerm("사용여부", "USE_YN", "여부C1");
    private static final StandardTerm STTS_CD = new StandardTerm("상태코드", "STTS_CD", "코드C3");
    private static final StandardTerm AMT = new StandardTerm("금액", "AMT", "금액N15");
    private static final List<Transition> CONFIRMED_PATH = List.of(
            new Transition("REVIEWED", "검토자", "2026-10-01"),
            new Transition("CONFIRMED", "업무담당", "2026-10-02"));
    private static final List<Transition> REVIEWED_PATH = List.of(new Transition("REVIEWED", "검토자", "2026-10-01"));
    private static final Load NONE = new Load(null, null, null, List.of());

    private final TermLedgerValidator validator = new TermLedgerValidator();

    @Test
    void aConfirmedRowWithAHumanPathAMeasuredRateAndALoadPasses() {
        TermLedger ledger = ledger(row("L1", "USER_ID").build());

        assertThat(validator.validate(ledger)).isEmpty();
        assertThat(validator.coverage(ledger, mapping(), inventory("USER_ID"))).isEmpty();
        assertThat(validator.live(ledger, Map.of(new TermKey("public", "USER_ID"),
                new StandardTermRecord("사용자ID", "ID V20", false)))).isEmpty();
        assertThat(validator.confirmedTermsBySchema(ledger)).isEqualTo(Map.of("public", Set.of("USER_ID")));
    }

    @Test
    void shapeErrorsNameTheRowWithoutRepeatingContent() {
        Entry noSource = row("L2", "x").source(null).status("PROPOSED").history(List.of()).build();
        Entry badGrade = row("L3", "c").grade("GUESS").status("PROPOSED").history(List.of()).build();
        Entry badStatus = row("L4", "d").status("DONE").build();
        Entry badId = row("bad id", "e").status("PROPOSED").history(List.of()).build();
        Entry duplicateId = row("L3", "f").status("PROPOSED").history(List.of()).build();
        Entry duplicateSource = row("L6", "C").sourceTable("LEGACY.LEGACY_USER").status("PROPOSED")
                .history(List.of()).build();

        List<String> errors = validator.validate(new TermLedger(3,
                List.of(noSource, badGrade, badStatus, badId, duplicateId, duplicateSource)));

        assertThat(errors).containsExactly(
                "원장 schemaVersion 은 2 이어야 합니다",
                "L2: source 표·컬럼이 필요합니다",
                "L3: grade 는 EXACT·SYNONYM·INFERRED·UNKNOWN 중 하나여야 합니다",
                "L4: 알 수 없는 상태입니다",
                "원장 행 ID 형식이 맞지 않습니다",
                "L3: 같은 ID 가 두 번 있습니다",
                "L6: 같은 소스 컬럼(LEGACY.LEGACY_USER.C)이 두 행에 있습니다");
        assertThat(validator.validate(new TermLedger(1, List.of())))
                .containsExactly("원장 schemaVersion 은 2 이어야 합니다 — 형식 1 원장은 형식 2 로 옮기세요");
    }

    @Test
    void historyMustBeALegalDatedHumanPathEndingAtTheStatus() {
        Entry skip = row("S1", "a").history(List.of(new Transition("CONFIRMED", "업무담당", "2026-10-02"))).build();
        Entry tool = row("S2", "b").history(List.of(new Transition("REVIEWED", "검토자", "2026-10-01"),
                new Transition("CONFIRMED", "Term-Suggest", "2026-10-02"))).build();
        Entry backwards = row("S3", "c").status("REVIEWED").history(List.of(
                new Transition("REVIEWED", "검토자", "2026-10-03"), new Transition("PROPOSED", "검토자", "2026-10-02"),
                new Transition("REVIEWED", "검토자", "2026-10-04"))).build();
        Entry noActor = row("S4", "d").status("REVIEWED")
                .history(List.of(new Transition("REVIEWED", " ", "2026-02-30"))).build();
        Entry mismatch = row("S5", "e").status("REVIEWED").history(List.of()).build();
        Entry reopened = row("S6", "f").status("REVIEWED").history(List.of(new Transition("REVIEWED", "a", "2026-10-01"),
                new Transition("REJECTED", "a", "2026-10-01"), new Transition("PROPOSED", "a", "2026-10-01"),
                new Transition("REVIEWED", "a", "2026-10-01"))).build();

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
        Entry noTerm = row("D1", "a").term(null).build();
        Entry wrongColumn = row("D2", "b").target("public.tb_user_info", "other").grade("UNKNOWN").build();
        Entry noLoad = row("D3", "c").load(null).build();
        Entry ignore = row("D6", "f").term(null).target(null).grade("UNKNOWN").status("APPROVED_IGNORE")
                .conformance(null).load(null).note(" ").history(path("APPROVED_IGNORE")).build();
        Entry archive = row("D7", "g").term(null).target(null).grade("UNKNOWN").status("ARCHIVE").conformance(null)
                .load(null).archive(new Archive("2027/01/01")).history(path("ARCHIVE")).build();
        Entry register = row("D8", "h").term(null).target(null).grade("INFERRED").status("REGISTRATION_REQUESTED")
                .conformance(null).load(null).history(path("REGISTRATION_REQUESTED")).build();
        Entry archived = row("D9", "i").term(null).target(null).grade("UNKNOWN").status("ARCHIVE").conformance(null)
                .load(null).archive(new Archive("2027-01-01")).history(path("ARCHIVE")).build();

        List<String> errors = validator.validate(ledger(noTerm, wrongColumn, noLoad, ignore, archive, register,
                archived));

        assertThat(errors).containsExactly(
                "D1: 확정에는 표준 용어(이름·영문약어·도메인)가 필요합니다 — 표준 용어가 없는 대상 컬럼이면 nonStandardTarget"
                        + " 으로 확정합니다",
                "D2: 대상 컬럼(other)이 표준 영문약어(USER_ID)와 다릅니다",
                "D2: 근거가 없는(UNKNOWN) 행은 확정할 수 없습니다",
                "D3: 확정에는 load(변환·type·codemap·nullify, 변환이 없으면 {})가 필요합니다",
                "D6: 이관 제외에는 사유(note)가 필요합니다",
                "D7: 외부 보관에는 보존 기한(archive.retainUntil, yyyy-MM-dd)이 필요합니다",
                "D8: 표준 등록 요청에는 요청할 용어 이름이 필요합니다");
    }

    @Test
    void theLoadUsesTheMappingVocabularyAndNullifiesOnlyWhatItCanReject() {
        Entry unknown = row("T1", "a").load(new Load("yyyymmdd", "integr", "bad name!", List.of())).build();
        Entry domainWithType = row("T2", "b").load(new Load("ymd8", "string", "flags", List.of())).note("n").build();
        Entry nullify = row("T3", "c").load(new Load("trim", null, null, List.of(nullify(null, 1L),
                nullify(DomainViolation.FORMAT, 1L), nullify(DomainViolation.BLANK, 0L),
                nullify(DomainViolation.BLANK, 2L)))).note("n").build();
        Entry placeholderOnText = row("T4", "d").load(new Load(null, "integer", null,
                List.of(nullify(DomainViolation.PLACEHOLDER_DATE, 1L)))).note("n").build();
        Entry fine = row("T5", "e").load(new Load(null, "integer", null, List.of(nullify(DomainViolation.BLANK, 1L))))
                .note("공백은 값 없음").build();

        List<String> errors = validator.validate(ledger(unknown, domainWithType, nullify, placeholderOnText, fine));

        assertThat(errors).containsExactly(
                "T1: load.transform 은 내장 변환기 이름이어야 합니다",
                "T1: load.type 은 mapping 이 아는 type 이어야 합니다",
                "T1: load.codemap 은 codemap 이름 형식(영문·숫자·_.- 64자 이내)이어야 합니다",
                "T2: 표준 도메인 변환기는 load 의 type·codemap 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다",
                "T3: load.nullify 항목에는 violation 이 필요합니다",
                "T3: load.nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다",
                "T3: load.nullify BLANK 는 이 load 가 내지 않는 위반입니다 — BLANK 는 표준 도메인 변환기나 비문자 type,"
                        + " PLACEHOLDER_DATE 는 날짜 변환기가 냅니다",
                "T3: load.nullify maxRows 는 1 이상이어야 합니다",
                "T3: load.nullify BLANK 는 이 load 가 내지 않는 위반입니다 — BLANK 는 표준 도메인 변환기나 비문자 type,"
                        + " PLACEHOLDER_DATE 는 날짜 변환기가 냅니다",
                "T3: load.nullify 에 같은 위반을 두 번 선언할 수 없습니다",
                "T4: load.nullify PLACEHOLDER_DATE 는 이 load 가 내지 않는 위반입니다 — BLANK 는 표준 도메인 변환기나"
                        + " 비문자 type, PLACEHOLDER_DATE 는 날짜 변환기가 냅니다");
    }

    @Test
    void aConfirmedRowNeedsAReferenceRateOrTheReasonsItCouldNotBeCountedWithANote() {
        Entry none = row("R1", "a").conformance(null).build();
        Entry empty = row("R2", "b").conformance(conformance(null, List.of(), null)).build();
        Entry unmeasuredWithoutNote = row("R3", "c").conformance(conformance(null, List.of("LENGTH_EXCEEDED"), null))
                .build();
        Entry unmeasuredWithNote = row("R4", "d").conformance(conformance(null, List.of("LENGTH_EXCEEDED"), null))
                .note("쓰기 단계가 길이를 막는다").build();
        Entry both = row("R5", "e").conformance(conformance("100", List.of("LENGTH_EXCEEDED"), null)).build();
        Entry outOfRange = row("R6", "f").conformance(conformance("101", List.of(), null)).build();
        Entry unknownReason = row("R7", "g").conformance(conformance(null, List.of("GUESSED", "GUESSED"), null))
                .note("n").build();
        Entry sampled = row("R8", "h").conformance(conformance(null, List.of("SAMPLED"), null)).note("n").build();
        Entry zero = row("R9", "i").conformance(conformance("0", List.of(), null)).build();
        // 추정기는 적합률을 센 위반으로만 낮춘다 — 위반 기록을 지운 행은 처리 없이 확정되지 않는다.
        Entry erased = row("R10", "j").conformance(conformance("92.0", List.of(), null)).build();

        List<String> errors = validator.validate(ledger(none, empty, unmeasuredWithoutNote, unmeasuredWithNote, both,
                outOfRange, unknownReason, sampled, zero, erased));

        assertThat(errors).containsExactly(
                "R1: 확정에는 적합률(conformance.rate)이나 셀 수 없었던 이유(conformance.unmeasured)가 필요합니다",
                "R2: 확정에는 적합률(conformance.rate)이나 셀 수 없었던 이유(conformance.unmeasured)가 필요합니다",
                "R3: 적합률을 셀 수 없었던(unmeasured) 행의 확정에는 사유(note)가 필요합니다",
                "R5: 적합률(rate)을 셌으면 셀 수 없었던 이유(unmeasured)를 둘 수 없습니다",
                "R6: conformance.rate 는 0~100 이어야 합니다",
                "R7: conformance.unmeasured 에는 추정기 이유(UNSUPPORTED_VALUE_TYPE·LENGTH_EXCEEDED·LENGTH_UNVERIFIED·"
                        + "ALLOWED_VALUES_UNVERIFIED·SAMPLED)만 한 번씩 둡니다",
                "R8: 일부만 읽은 프로파일(SAMPLED)로는 확정할 수 없습니다 — 행 제한 없이 프로파일을 다시 만드세요",
                "R9: 적합률이 100 미만인데 기록된 위반이나 승인 예외가 없습니다 — 추정기 초안의 위반 기록을 지우지 마세요",
                "R10: 적합률이 100 미만인데 기록된 위반이나 승인 예외가 없습니다 — 추정기 초안의 위반 기록을 지우지 마세요");
    }

    @Test
    void theHintMustBeMappingVocabularyAndAMixedColumnNeedsAChosenTransformer() {
        Entry custom = row("H1", "a").conformance(conformance("100", List.of(), "custom:ymd8")).build();
        Entry upperType = row("H2", "b").conformance(conformance("100", List.of(), "type:NUMERIC")).build();
        Entry mixed = row("H3", "c").conformance(conformance("100", List.of(), "mixed")).build();
        Entry mixedChosen = row("H4", "d").conformance(conformance("100", List.of(), "mixed"))
                .load(new Load("timestamp-text", null, null, List.of())).build();
        Entry vocabulary = row("H5", "e").conformance(conformance("100", List.of(), "type:numeric")).build();
        Entry codemap = row("H6", "f").conformance(conformance("100", List.of(), "codemap")).build();

        assertThat(validator.validate(ledger(custom, upperType, mixed, mixedChosen, vocabulary, codemap)))
                .containsExactly(
                        "H1: conformance.transform 은 mapping 어휘(transform:<내장 변환기>·type:<type>·codemap·mixed)여야"
                                + " 합니다",
                        "H2: conformance.transform 은 mapping 어휘(transform:<내장 변환기>·type:<type>·codemap·mixed)여야"
                                + " 합니다",
                        "H3: 모양마다 다른 변환이 필요한(mixed) 컬럼은 load.transform 을 정해야 확정할 수 있습니다");
    }

    @Test
    void everyRecordedViolationNeedsARuntimeTreatment() {
        // 자리표시 날짜: 날짜 도메인 변환기 + nullify 나 승인 예외.
        Entry placeholderBare = row("V1", "a").term(END_YMD).load(load("ymd8"))
                .conformance(rated(v("PLACEHOLDER_DATE", 12))).build();
        Entry placeholderNullified = row("V2", "b").term(END_YMD)
                .load(load("ymd8", nullify(DomainViolation.PLACEHOLDER_DATE, 12L))).note("종료일 없음")
                .conformance(rated(v("PLACEHOLDER_DATE", 12))).build();
        Entry placeholderApproved = row("V3", "c").term(END_YMD).load(load("ymd8"))
                .conformance(rated(approved("PLACEHOLDER_DATE"), v("PLACEHOLDER_DATE", 3))).build();
        // 공백: 공백을 판정하는 load(도메인 변환기·비문자 type)여야 nullify·승인 예외가 닿는다.
        Entry blankUnjudged = row("V4", "d").term(AMT).load(NONE)
                .conformance(rated(approved("BLANK"), v("BLANK", 2))).build();
        Entry blankTyped = row("V5", "e").term(AMT).load(new Load(null, "numeric", null,
                List.of(nullify(DomainViolation.BLANK, 2L)))).note("공백은 값 없음")
                .conformance(rated(v("BLANK", 2))).build();
        // codemap 은 공백을 표준 코드로 정하거나 unmapped: fail 로 멈춘다(허용값 밖 코드와 같은 처리).
        Entry blankThroughCodemap = row("V6", "f").term(STTS_CD).load(new Load(null, null, "status", List.of()))
                .conformance(rated(v("BLANK", 2))).build();
        // 달력 밖·형식 밖: 그 값을 판정하는 load 가 멈추는 코드의 승인 예외.
        Entry invalidApproved = row("V7", "g").term(END_YMD).load(load("ymd8"))
                .conformance(rated(approved("INVALID_DATE"), v("INVALID_DATE", 3))).build();
        Entry invalidWrongCode = row("V8", "h").term(END_YMD).load(load("ymd8"))
                .conformance(rated(approved("FORMAT"), v("INVALID_DATE", 3))).build();
        Entry formatUnjudged = row("V9", "i").term(AMT).load(NONE)
                .conformance(rated(approved("FORMAT"), v("FORMAT", 1))).build();
        Entry formatTyped = row("V10", "j").term(AMT).load(new Load(null, "numeric", null, List.of()))
                .conformance(rated(approved("FORMAT"), v("FORMAT", 1))).build();
        Entry formatThroughCodemap = row("V11", "k").term(STTS_CD).load(new Load(null, "numeric", "status", List.of()))
                .conformance(rated(approved("FORMAT"), v("FORMAT", 1))).build();
        // 허용값 밖 코드: codemap 으로만.
        Entry notAllowedBare = row("V12", "l").term(STTS_CD).load(NONE)
                .conformance(rated(v("NOT_ALLOWED", 4))).build();
        Entry notAllowedMapped = row("V13", "m").term(STTS_CD).load(new Load(null, null, "status", List.of()))
                .conformance(rated(v("NOT_ALLOWED", 4))).build();

        List<String> errors = validator.validate(ledger(placeholderBare, placeholderNullified, placeholderApproved,
                blankUnjudged, blankTyped, blankThroughCodemap, invalidApproved, invalidWrongCode, formatUnjudged,
                formatTyped, formatThroughCodemap, notAllowedBare, notAllowedMapped));

        assertThat(errors).containsExactly(
                "V1: 기록된 위반 PLACEHOLDER_DATE(12행)을 처리하지 않습니다 — 날짜 도메인 변환기에 nullify PLACEHOLDER_DATE"
                        + " 나 승인 예외 PLACEHOLDER_DATE 를 두세요",
                "V4: 기록된 위반 BLANK(2행)을 처리하지 않습니다 — 공백을 판정하는 load(표준 도메인 변환기·비문자 type)에"
                        + " nullify BLANK 나 승인 예외 BLANK 를 두거나, codemap(unmapped: fail)으로 공백의 표준 코드를"
                        + " 정하세요",
                "V8: 기록된 위반 INVALID_DATE(3행)을 처리하지 않습니다 — 이 load 는 그 값을 INVALID_DATE 로 멈추므로 승인"
                        + " 예외에 INVALID_DATE 가 필요합니다",
                "V9: 기록된 위반 FORMAT(1행)을 처리하지 않습니다 — 그 값을 판정하는 load(표준 도메인 변환기·비문자 type·"
                        + "codemap)가 필요합니다",
                "V11: 기록된 위반 FORMAT(1행)을 처리하지 않습니다 — 이 load 는 그 값을 CODEMAP_UNMAPPED 로 멈추므로 승인"
                        + " 예외에 CODEMAP_UNMAPPED 가 필요합니다",
                "V12: 기록된 위반 NOT_ALLOWED(4행)을 처리하지 않습니다 — 허용값 밖 코드는 codemap(unmapped: fail)으로만"
                        + " 처리합니다 — 격리할 수 없습니다");
    }

    @Test
    void recordedViolationsMustBeCountedOnceAndInTheEstimatorVocabulary() {
        Entry unknownType = row("W1", "a").conformance(rated(v("TYPO", 1))).build();
        Entry noRows = row("W2", "b").conformance(rated(new ViolationCount("FORMAT", null))).build();
        Entry twice = row("W3", "c").load(new Load(null, "numeric", null, List.of()))
                .conformance(rated(approved("FORMAT"), v("FORMAT", 1), v("FORMAT", 2))).build();

        assertThat(validator.validate(ledger(unknownType, noRows, twice))).containsExactly(
                "W1: conformance.violations 에는 셀 수 있는 위반(BLANK·PLACEHOLDER_DATE·INVALID_DATE·FORMAT·NOT_ALLOWED)을"
                        + " 1 이상의 행 수와 한 번씩 둡니다",
                "W2: conformance.violations 에는 셀 수 있는 위반(BLANK·PLACEHOLDER_DATE·INVALID_DATE·FORMAT·NOT_ALLOWED)을"
                        + " 1 이상의 행 수와 한 번씩 둡니다",
                "W2: 기록된 위반 FORMAT(null행)을 처리하지 않습니다 — 그 값을 판정하는 load(표준 도메인 변환기·비문자 type·"
                        + "codemap)가 필요합니다",
                "W3: conformance.violations 에는 셀 수 있는 위반(BLANK·PLACEHOLDER_DATE·INVALID_DATE·FORMAT·NOT_ALLOWED)을"
                        + " 1 이상의 행 수와 한 번씩 둡니다");
    }

    @Test
    void uncountedViolationsNeedARowLevelJudgementOrTheNoteForUnverifiedAllowedValues() {
        Entry lobUnjudged = row("U1", "a").load(NONE).conformance(conformance(null,
                List.of("UNSUPPORTED_VALUE_TYPE"), null)).note("CLOB 내용").build();
        Entry lobTyped = row("U2", "b").load(new Load(null, "text", null, List.of())).conformance(conformance(null,
                List.of("UNSUPPORTED_VALUE_TYPE"), null)).note("CLOB 내용").build();
        Entry lobTransformed = row("U3", "c").term(END_YMD).load(load("ymd8")).conformance(conformance(null,
                List.of("UNSUPPORTED_VALUE_TYPE"), "transform:ymd8")).note("이진 값은 멈춘다").build();
        Entry length = row("U4", "d").load(NONE).conformance(conformance(null,
                List.of("LENGTH_EXCEEDED", "LENGTH_UNVERIFIED"), null)).note("쓰기 단계가 길이를 막는다").build();
        // DEC-OPS-317 U3: 허용값을 확인하지 못한 코드 컬럼은 codemap 없이 사유로 확정한다.
        Entry unverifiedNoted = row("U5", "e").term(STTS_CD).load(NONE).conformance(conformance(null,
                List.of("ALLOWED_VALUES_UNVERIFIED"), null)).note("허용값 대사는 L4").build();
        Entry unverifiedMapped = row("U6", "f").term(USE_YN).load(new Load(null, null, "flags", List.of()))
                .conformance(conformance(null, List.of("ALLOWED_VALUES_UNVERIFIED"), "codemap")).note("1·0 극성 확인")
                .build();

        assertThat(validator.validate(ledger(lobUnjudged, lobTyped, lobTransformed, length, unverifiedNoted,
                unverifiedMapped))).containsExactly(
                "U1: 추정기가 판정하지 못한 값 종류(UNSUPPORTED_VALUE_TYPE)가 있어 load 가 행마다 판정해야 합니다 — 표준"
                        + " 도메인 변환기나 type 을 두세요");
    }

    @Test
    void approvedExceptionsAreBoundedJustifiedAndIsolatable() {
        Entry zero = row("A1", "a").conformance(rated(new ApprovedExceptions(0L, "r", List.of("FORMAT")))).build();
        Entry tooMany = row("A2", "b").conformance(rated(new ApprovedExceptions(1001L, "r", List.of("FORMAT"))))
                .build();
        Entry atCap = row("A3", "c").conformance(rated(new ApprovedExceptions(1000L, "r", List.of("FORMAT"))))
                .build();
        Entry noReason = row("A4", "d").conformance(rated(new ApprovedExceptions(1L, " ", List.of("FORMAT"))))
                .build();
        Entry noCodes = row("A5", "e").conformance(rated(new ApprovedExceptions(1L, "r", List.of()))).build();
        Entry notIsolatable = row("A6", "f").conformance(rated(new ApprovedExceptions(1L, "r",
                List.of("NOT_ALLOWED")))).build();
        Entry duplicated = row("A7", "g").conformance(rated(new ApprovedExceptions(1L, "r",
                List.of("FORMAT", "FORMAT")))).build();
        Entry unsupported = row("A8", "h").conformance(rated(new ApprovedExceptions(1L, "r",
                List.of("UNSUPPORTED_VALUE_TYPE")))).build();
        Entry noCap = row("A9", "i").conformance(rated(new ApprovedExceptions(null, "r", List.of("FORMAT")))).build();

        List<String> errors = validator.validate(ledger(zero, tooMany, atCap, noReason, noCodes, notIsolatable,
                duplicated, unsupported, noCap));

        String isolatable = ": 승인 예외의 위반은 격리할 수 있는 코드(INVALID_DATE·PLACEHOLDER_DATE·TIME_PRESENT·FORMAT·"
                + "BLANK·CODEMAP_UNMAPPED·LENGTH_EXCEEDED·PRECISION_EXCEEDED·REQUIRED_MISSING)를 한 번씩 둡니다";
        assertThat(errors).containsExactly(
                "A1: 승인 예외 maxRows 는 1~1000 이어야 합니다",
                "A2: 승인 예외 maxRows 는 1~1000 이어야 합니다",
                "A4: 승인 예외에는 사유(reason)가 필요합니다",
                "A5: 승인 예외에는 격리할 위반(violations)이 필요합니다",
                "A6" + isolatable,
                "A7" + isolatable,
                "A8" + isolatable,
                "A9: 승인 예외 maxRows 는 1~1000 이어야 합니다");
    }

    @Test
    void fixedFormatAndYesNoDomainsNeedTheirStandardTreatment() {
        Entry date8Bare = row("G1", "a").term(END_YMD).load(NONE).build();
        Entry date8 = row("G2", "b").term(END_YMD).load(load("ymd8")).build();
        Entry date8Truncate = row("G3", "c").term(END_YMD).load(load("ymd8-truncate")).note("시각은 버린다").build();
        Entry datetimeWrong = row("G4", "d").term(REG_DT).load(load("ymd8")).build();
        Entry datetime = row("G5", "e").term(REG_DT).load(load("ymdhms14")).build();
        Entry time = row("G6", "f").term(REG_TM).load(load("hms6")).build();
        Entry timeBare = row("G7", "g").term(REG_TM).load(new Load(null, "string", null, List.of())).build();
        Entry ynTransformer = row("G8", "h").term(USE_YN).load(load("yn")).build();
        Entry ynCodemap = row("G9", "i").term(USE_YN).load(new Load(null, null, "flags", List.of())).build();
        Entry ynBare = row("G10", "j").term(USE_YN).load(NONE).build();
        Entry code = row("G11", "k").term(STTS_CD).load(NONE).build();

        assertThat(validator.validate(ledger(date8Bare, date8, date8Truncate, datetimeWrong, datetime, time, timeBare,
                ynTransformer, ynCodemap, ynBare, code))).containsExactly(
                "G1: DATE8 범주 도메인 컬럼의 load 에는 ymd8 또는 ymd8-truncate 가 필요합니다",
                "G4: DATETIME14 범주 도메인 컬럼의 load 에는 ymdhms14 가 필요합니다",
                "G7: TIME6 범주 도메인 컬럼의 load 에는 hms6 가 필요합니다",
                "G10: YN 범주 도메인 컬럼의 load 에는 yn 또는 codemap 가 필요합니다");
    }

    @Test
    void rowsThatChangeValuesByRuleNeedANote() {
        Entry truncate = row("N1", "a").term(END_YMD).load(load("ymd8-truncate")).build();
        Entry dateTruncate = row("N2", "b").load(load("date-truncate")).build();
        Entry fromDate = row("N3", "c").load(load("timestamp-from-date")).build();
        Entry nullify = row("N4", "d").term(END_YMD).load(load("ymd8", nullify(DomainViolation.BLANK, 1L))).build();
        Entry noted = row("N5", "e").load(load("timestamp-from-date")).note("자정을 붙인다").build();
        Entry plain = row("N6", "f").load(load("date-text")).build();

        String note = ": 값을 규칙으로 바꾸는 load(시각 버림·자정 붙임 변환기, nullify)에는 사유(note)가 필요합니다";
        assertThat(validator.validate(ledger(truncate, dateTruncate, fromDate, nullify, noted, plain)))
                .containsExactly("N1" + note, "N2" + note, "N3" + note, "N4" + note);
    }

    @Test
    void mappingAndViaAreOnlyForConfirmedRowsInIdentifierForm() {
        Entry onProposed = row("M1", "a").status("PROPOSED").history(List.of()).mapping("user_main").build();
        Entry onIgnore = row("M2", "b").term(null).target(null).status("APPROVED_IGNORE").note("키").load(null)
                .conformance(null).history(path("APPROVED_IGNORE")).via(new Via("orders", "cust")).build();
        Entry badMapping = row("M3", "c").mapping("User-Main").build();
        Entry badVia = row("M4", "d").via(new Via("orders", null)).build();
        Entry fine = row("M5", "e").mapping("user_main").via(new Via("orders", "cust")).build();

        Entry viaOnly = row("M6", "f").via(new Via("orders", "cust")).build();

        assertThat(validator.validate(ledger(onProposed, onIgnore, badMapping, badVia, fine, viaOnly)))
                .containsExactly(
                "M1: mapping·via 는 확정 행에만 둡니다",
                "M2: 이관 제외·외부 보관 행에는 mapping·via 를 둘 수 없습니다 — 매핑과 무관하게 소스 컬럼을 처분합니다",
                "M3: mapping 은 매핑 id 형식(소문자로 시작하는 소문자·숫자·밑줄 63자 이내)이어야 합니다",
                "M4: via 에는 매핑 id(mapping)와 조회 별칭(lookup)이 매핑 id 형식으로 필요합니다",
                // [ADR-0029 L3d] 조회 경로 행의 매핑은 via.mapping 이다 — mapping 을 함께 두면 어느 매핑인지 갈린다.
                "M5: 조회 경로(via) 행에는 mapping 을 두지 않습니다 — 그 컬럼을 읽는 매핑은 via.mapping 입니다");
    }

    @Test
    void aConfirmedRowIsUniqueBySourceMappingAndViaAndADisposedSourceCannotAlsoBeConfirmed() {
        Entry first = row("K1", "USER_ID").build();
        Entry sameDefault = row("K2", "user_id").sourceTable("LEGACY.LEGACY_USER").build();
        Entry otherMapping = row("K3", "USER_ID").mapping("user_ext").build();
        Entry viaLookup = row("K4", "USER_ID").via(new Via("orders", "cust")).build();
        Entry sameVia = row("K5", "USER_ID").via(new Via("orders", "cust")).build();
        Entry reviewedToo = row("K6", "USER_ID").status("REVIEWED").history(REVIEWED_PATH).build();
        Entry ignored = row("K7", "USER_ID").term(null).target(null).status("APPROVED_IGNORE").note("키로만 쓴다")
                .load(null).conformance(null).history(path("APPROVED_IGNORE")).build();
        Entry archivedTwice = row("K8", "ETC").term(null).target(null).status("ARCHIVE").load(null).conformance(null)
                .archive(new Archive("2027-01-01")).history(path("ARCHIVE")).build();
        Entry archivedAgain = row("K9", "etc").term(null).target(null).status("ARCHIVE").load(null).conformance(null)
                .archive(new Archive("2027-01-01")).history(path("ARCHIVE")).build();

        assertThat(validator.validate(ledger(first, sameDefault, otherMapping, viaLookup, sameVia, reviewedToo,
                ignored, archivedTwice, archivedAgain))).containsExactly(
                "K2: 같은 소스 컬럼(LEGACY.LEGACY_USER.user_id)이 같은 매핑·조회 경로와 대상 컬럼으로 두 번 확정됐습니다",
                "K5: 같은 소스 컬럼(legacy.legacy_user.USER_ID)이 같은 매핑·조회 경로와 대상 컬럼으로 두 번 확정됐습니다",
                "K7: 같은 소스 컬럼(legacy.legacy_user.USER_ID)이 두 행에 있습니다",
                "K9: 같은 소스 컬럼(legacy.legacy_user.etc)이 두 행에 있습니다",
                "K7: legacy.legacy_user.USER_ID 을 APPROVED_IGNORE 로 처분했는데 확정 행(K1)이 같은 소스 컬럼을 옮깁니다");
    }

    @Test
    void oneSourceColumnMayFeedSeveralTargets() {
        // 한 대상 컬럼을 두 컬럼 항목이 채우는 mapping 은 mapping 정적 검증이 거부한다(MappingValidatorTest).
        StandardTerm firstRegistrant = new StandardTerm("최초등록자ID", "FRST_RGTR_ID", "ID V20");
        StandardTerm lastModifier = new StandardTerm("최종수정자ID", "LAST_MDFR_ID", "ID V20");
        Entry toFirst = row("F1", "REG_ID").term(firstRegistrant).build();
        Entry toLast = row("F2", "REG_ID").term(lastModifier).build();
        MappingSpec fanOut = new MappingSpec(null, null, List.of(new TableMapping("legacy.legacy_user",
                "public.tb_user_info", null, "USER_ID", "user_id", List.of(
                new ColumnMapping("REG_ID", "frst_rgtr_id", null, null, null, null, null),
                new ColumnMapping("REG_ID", "last_mdfr_id", null, null, null, null, null)), null)), Map.of());

        assertThat(validator.validate(ledger(toFirst, toLast))).isEmpty();
        assertThat(validator.coverage(ledger(toFirst, toLast), fanOut, inventory("REG_ID"))).isEmpty();
        assertThat(validator.coverage(ledger(toFirst, toLast), mapping(new ColumnMapping("REG_ID", "frst_rgtr_id",
                null, null, null, null, null)), inventory("REG_ID"))).containsExactly(
                "F2 legacy.legacy_user.REG_ID(CONFIRMED): 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시 만드세요");
    }

    @Test
    void coverageFindsConflictsBetweenRowsThatNameTheSameColumnDifferently() {
        Entry confirmed = row("N1", "USER_ID").build();
        Entry ignored = row("N2", "user_id").sourceTable("legacy_user").term(null).target(null)
                .status("APPROVED_IGNORE").note("키로만 쓴다").load(null).conformance(null).history(path("APPROVED_IGNORE"))
                .build();
        Entry reviewed = row("N3", "ETC").status("REVIEWED").history(REVIEWED_PATH).build();
        Entry reviewedAgain = row("N4", "etc").sourceTable("LEGACY_USER").status("REVIEWED").history(REVIEWED_PATH)
                .build();
        TermLedger ledger = ledger(confirmed, ignored, reviewed, reviewedAgain);

        assertThat(validator.validate(ledger)).as("표기가 달라 validate 는 같은 컬럼인지 모른다").isEmpty();
        assertThat(validator.coverage(ledger, mapping(), inventory("USER_ID", "ETC"))).containsExactly(
                "N2 legacy_user.user_id(APPROVED_IGNORE): 처분한 소스 컬럼을 확정 행(N1)이 옮깁니다(원장 표 표기가 다른 행)",
                "N4 LEGACY_USER.etc(REVIEWED): 같은 소스 컬럼의 확정되지 않은 행(N3)이 이미 있습니다(원장 표 표기가 다른 행)",
                "N3 legacy.legacy_user.ETC(REVIEWED): 소스 표의 컬럼이 확정·이관 제외·외부 보관 중 하나로 정해지지 않았습니다");
    }

    @Test
    void anFkRefColumnTakesOnlyAKeyNormalizingLoadAsTheGeneratorDoes() {
        Entry trimmed = row("G1", "USER_ID").load(load("trim")).build();
        Entry dated = row("G2", "USER_ID").load(load("ymd8")).build();
        CatalogSnapshot inventory = inventory("USER_ID");

        assertThat(validator.coverage(ledger(trimmed), mapping(new ColumnMapping("USER_ID", "user_id", "trim", null,
                null, "legacy.legacy_other", null)), inventory)).isEmpty();
        assertThat(validator.coverage(ledger(dated), mapping(new ColumnMapping("USER_ID", "user_id", "ymd8", null,
                null, "legacy.legacy_other", null)), inventory)).containsExactly(
                "legacy.legacy_user.USER_ID: fkRef 컬럼의 원장 행 G2 load 는 키를 정규화하는 처리(trim·upper·lower·문자"
                        + " type)만 받습니다 — 표준 도메인 변환기·codemap·nullify 는 부모 키를 바꿉니다");
    }

    @Test
    void aNonStandardTargetIsConfirmedWithAReasonInsteadOfATermAndWithoutConformance() {
        Entry binary = nonStandard("B1", "PHOTO", "photo").build();
        Entry noReason = nonStandard("B2", "SIGN", "sign").nonStandard(new NonStandardTarget(" ")).build();
        Entry withTerm = nonStandard("B3", "MEMO", "memo").term(USER_ID).build();
        Entry withConformance = nonStandard("B4", "DOC", "doc").conformance(rated()).build();
        Entry onIgnore = nonStandard("B5", "OLD", "old").status("APPROVED_IGNORE").note("n")
                .history(path("APPROVED_IGNORE")).build();
        Entry noLoad = nonStandard("B6", "BLOB2", "blob2").load(null).build();

        assertThat(validator.validate(ledger(binary, noReason, withTerm, withConformance, onIgnore, noLoad)))
                .containsExactly(
                        "B2: 비표준 대상(nonStandardTarget)에는 사유(reason)가 필요합니다",
                        "B3: 표준 용어(term)와 비표준 대상(nonStandardTarget)을 함께 둘 수 없습니다",
                        "B4: 비표준 대상 행에는 conformance 를 두지 않습니다 — 대조할 표준 도메인이 없습니다",
                        "B5: 이관 제외·외부 보관 행에는 비표준 대상을 둘 수 없습니다",
                        "B6: 확정에는 load(변환·type·codemap·nullify, 변환이 없으면 {})가 필요합니다");
        assertThat(validator.confirmedTermsBySchema(ledger(binary))).isEqualTo(Map.of("public", Set.of("PHOTO")));
    }

    @Test
    void aNonStandardTargetIsAcceptedOnlyWhenTheLiveMetaHasNoTermForThatColumn() {
        TermLedger ledger = ledger(nonStandard("B1", "PHOTO", "photo").build());

        assertThat(validator.live(ledger, Map.of())).isEmpty();
        assertThat(validator.live(ledger, Map.of(new TermKey("app", "PHOTO"),
                new StandardTermRecord("사진", "이미지", false)))).as("다른 schema 의 용어는 상관없다").isEmpty();
        assertThat(validator.live(ledger, Map.of(new TermKey("public", "photo"),
                new StandardTermRecord("사진", "이미지", true)))).containsExactly(
                "B1: 대상 컬럼 photo 에는 live 메타의 표준 용어가 있어 비표준 대상으로 확정할 수 없습니다");
    }

    @Test
    void everyMappedSourceColumnNeedsAConfirmedRowForTheSameTarget() {
        Entry confirmed = row("C1", "USER_ID").build();
        Entry reviewed = row("C2", "USER_NM").status("REVIEWED").history(REVIEWED_PATH).build();
        Entry elsewhere = row("C3", "REG_DT").target("public.tb_other", "reg_dt").term(REG_DT).load(load("ymdhms14"))
                .build();
        MappingSpec mapping = new MappingSpec(null, null, List.of(new TableMapping(
                "LEGACY.LEGACY_USER", "public.tb_user_info", null, "USER_ID", "user_id",
                List.of(new ColumnMapping("user_id", "USER_ID", null, null, null, null, null),
                        new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null),
                        new ColumnMapping("REG_DT", "reg_dt", null, null, null, null, null),
                        new ColumnMapping("ETC", "etc", null, null, null, null, null),
                        new ColumnMapping(null, "use_yn", null, null, null, null, "Y")),
                null)), Map.of());

        assertThat(validator.coverage(ledger(confirmed, reviewed, elsewhere), mapping,
                inventory("USER_ID", "USER_NM", "REG_DT", "ETC"))).containsExactly(
                "LEGACY.LEGACY_USER.USER_NM: 원장 행 C2 이 확정되지 않았습니다(REVIEWED)",
                "LEGACY.LEGACY_USER.REG_DT: 원장 행 C3 의 대상과 mapping 의 대상(public.tb_user_info.reg_dt)이 다릅니다",
                "LEGACY.LEGACY_USER.ETC: 원장에 없는 매핑입니다");
    }

    @Test
    void coverageMatchesRowsToTheirMappingIdAndRefusesRowsTheRuntimeCannotRunYet() {
        Entry split = row("C1", "USER_ID").mapping("user_ext").target("public.tb_user_ext", "user_id").build();
        Entry reviewing = row("C2", "USER_ID").status("REVIEWED").history(REVIEWED_PATH).build();
        Entry main = row("C3", "USER_ID").build();
        Entry joined = row("C4", "USER_ID").via(new Via("orders", "cust")).target("public.tb_order", "user_id")
                .build();
        Entry archived = row("C5", "ETC").status("ARCHIVE").history(path("ARCHIVE")).build();
        CatalogSnapshot inventory = inventory("USER_ID", "ETC");
        Entry ignored = row("C6", "ETC").status("APPROVED_IGNORE").history(path("APPROVED_IGNORE")).build();

        assertThat(validator.coverage(ledger(reviewing, main, ignored), mapping(), inventory)).isEmpty();
        // [ADR-0029 L3c] 기본이 아닌 매핑의 확정 행은 그 id 의 매핑이 mapping 에 있어야 한다.
        String missingSplit = "C1 legacy.legacy_user.USER_ID(CONFIRMED): 확정 행의 매핑(user_ext)이 mapping 에 없습니다 —"
                + " skeleton 에 그 id 의 매핑을 두고 mapping-generate 로 다시 만드세요";
        assertThat(validator.coverage(ledger(split, reviewing, main, joined, archived), mapping(), inventory))
                .containsExactly(
                        "C5 legacy.legacy_user.ETC(ARCHIVE): 외부 보관(ARCHIVE)은 아직 실행할 수 없습니다(L3e 전) — 이관해야"
                                + " 할 데이터를 이관 제외로 돌리지 마세요",
                        missingSplit,
                        // [ADR-0029 L3d] 조회 경로 행은 그 매핑 id 가 mapping 에 있어야 한다.
                        "C4 legacy.legacy_user.USER_ID(CONFIRMED): 조회 경로의 매핑(orders)이 mapping 에 없습니다 —"
                                + " skeleton 에 그 id 의 매핑을 두고 mapping-generate 로 다시 만드세요");
        assertThat(validator.coverage(ledger(split, reviewing, ignored), mapping(), inventory)).containsExactly(
                "legacy.legacy_user.USER_ID: 이 매핑의 확정 행이 없습니다 — 원장 행 C1 은 다른 mapping·조회 경로입니다",
                missingSplit);

        // 나눈 매핑이 mapping 에 있으면 매핑 id 마다 제 확정 행과 맞는다. 다른 id 의 행을 빌려 쓰지 않는다.
        TableMapping user = new TableMapping("legacy.legacy_user", "public.tb_user_info", null, "USER_ID", List.of(),
                "user_id", List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)), null, null,
                List.of(), null);
        TableMapping ext = new TableMapping("legacy.legacy_user", "public.tb_user_ext", null, "USER_ID", List.of(),
                "user_id", List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)), null, null,
                List.of(), "user_ext");
        MappingSpec splitMapping = new MappingSpec(null, null, List.of(user, ext), Map.of());
        assertThat(validator.coverage(ledger(split, main, ignored), splitMapping, inventory)).isEmpty();
        assertThat(validator.coverage(ledger(main, ignored), splitMapping, inventory)).containsExactly(
                "legacy.legacy_user#user_ext.USER_ID: 이 매핑의 확정 행이 없습니다 — 원장 행 C3 은 다른 mapping·조회 경로입니다");
    }

    /**
     * [ADR-0029 L3d] 조회 컬럼은 조회 표의 inventory 컬럼과 같은 조회 경로(매핑 id·별칭)의 확정 행으로 맞춘다. 조회만 하는
     * 표도 소스 단위 완전성을 받아, 원장 행이 없는 조회 표 컬럼은 plan 에서 멈춘다.
     */
    @Test
    void lookupColumnsMatchTheirViaRowsAndTheLookupTableMustBeComplete() {
        Entry user = row("V1", "USER_ID").mapping("users").build();
        Entry etc = row("V2", "ETC").status("APPROVED_IGNORE").term(null).target(null).load(null).conformance(null)
                .note("쓰지 않는 컬럼").history(path("APPROVED_IGNORE")).build();
        Entry otherName = row("V3", "X").sourceTable("legacy.legacy_other").via(new Via("users", "oth"))
                .term(USER_NM).build();
        Entry otherKey = row("V4", "Y").sourceTable("legacy.legacy_other").status("APPROVED_IGNORE").term(null)
                .target(null).load(null).conformance(null).note("조회 키로만 쓴다").history(path("APPROVED_IGNORE"))
                .build();
        CatalogSnapshot inventory = lookupInventory();
        MappingSpec mapping = lookupMapping(new ColumnMapping("oth.X", "user_nm", null, null, null, null, null));

        assertThat(validator.validate(ledger(user, etc, otherName, otherKey))).isEmpty();
        assertThat(validator.coverage(ledger(user, etc, otherName, otherKey), mapping, inventory)).isEmpty();
        // 조회 표의 컬럼에 원장 행이 없으면 plan 이 멈춘다 — 조회 키처럼 옮기지 않는 컬럼도 이관 제외와 사유로 적는다.
        assertThat(validator.coverage(ledger(user, etc, otherName), mapping, inventory)).containsExactly(
                "legacy_other.Y: mapping·원장 어디에도 없는 컬럼입니다 — 옮기면 확정하고, 키로만 쓰거나 옮기지 않으면 이관"
                        + " 제외(APPROVED_IGNORE)와 사유를 적으세요");
        // 같은 컬럼이라도 조회 경로 없는 행은 조회 컬럼의 짝이 아니다.
        Entry direct = row("V5", "X").sourceTable("legacy.legacy_other").target("public.tb_user_info", "user_nm")
                .build();
        assertThat(validator.coverage(ledger(user, etc, direct, otherKey), mapping, inventory)).containsExactly(
                "legacy.legacy_user#users.oth.X: 이 매핑의 확정 행이 없습니다 — 원장 행 V5 은 다른 mapping·조회 경로입니다",
                "V5 legacy.legacy_other.X(CONFIRMED): 확정 행의 매핑(기본 매핑)이 mapping 에 없습니다 — skeleton 에 그"
                        + " id 의 매핑을 두고 mapping-generate 로 다시 만드세요");
        // 조회 컬럼의 변환은 그 확정 행의 load 와 같아야 한다.
        assertThat(validator.coverage(ledger(user, etc, otherName, otherKey),
                lookupMapping(new ColumnMapping("oth.X", "user_nm", "trim", null, null, null, null)), inventory))
                .containsExactly("legacy.legacy_user#users.oth.X: mapping 의 변환(transform·type·codemap·nullify)이 원장"
                        + " 행 V3 의 load 와 다릅니다 — mapping-generate 로 다시 만드세요");
    }

    @Test
    void anUnusedViaRowNamesWhyItsLookupPathIsMissing() {
        Entry user = row("W1", "USER_ID").mapping("users").build();
        Entry etc = row("W2", "ETC").status("APPROVED_IGNORE").term(null).target(null).load(null).conformance(null)
                .note("쓰지 않는 컬럼").history(path("APPROVED_IGNORE")).build();
        Entry otherName = row("W3", "X").sourceTable("legacy.legacy_other").via(new Via("users", "oth"))
                .term(USER_NM).build();
        Entry unknownMapping = row("W5", "Y").sourceTable("legacy.legacy_other").via(new Via("orders", "oth"))
                .target("public.tb_user_info", "cnt").build();
        Entry unknownAlias = row("W6", "Y").sourceTable("legacy.legacy_other").via(new Via("users", "dept"))
                .target("public.tb_user_info", "cnt").build();
        Entry otherTable = row("W7", "USER_ID").via(new Via("users", "oth")).target("public.tb_user_info", "cnt")
                .build();
        Entry unread = row("W8", "Y").sourceTable("legacy.legacy_other").via(new Via("users", "oth"))
                .target("public.tb_user_info", "cnt").build();
        MappingSpec mapping = lookupMapping(new ColumnMapping("oth.X", "user_nm", null, null, null, null, null));

        assertThat(validator.coverage(ledger(user, etc, otherName, unknownMapping, unknownAlias, otherTable, unread),
                mapping, lookupInventory())).containsExactly(
                "W5 legacy.legacy_other.Y(CONFIRMED): 조회 경로의 매핑(orders)이 mapping 에 없습니다 — skeleton 에 그 id 의"
                        + " 매핑을 두고 mapping-generate 로 다시 만드세요",
                "W6 legacy.legacy_other.Y(CONFIRMED): 조회 경로의 별칭(dept)을 매핑 users 이 선언하지 않았습니다 —"
                        + " skeleton 의 그 매핑에 lookups 를 두세요",
                "W7 legacy.legacy_user.USER_ID(CONFIRMED): 조회 별칭(users/oth)이 읽는 표가 원장 행의 소스 표와 다릅니다",
                "W8 legacy.legacy_other.Y(CONFIRMED): 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시 만드세요");
    }

    @Test
    void coverageResolvesTablesThroughTheInventoryAndChecksBothDirectionsPerSourceTable() {
        // 원장은 표를 schema 없이 적어도 inventory 의 같은 표다.
        Entry userId = row("R1", "USER_ID").sourceTable("LEGACY_USER").build();
        Entry userName = row("R2", "USER_NM").target("public.tb_user_info", "user_nm").build();
        Entry ignored = row("R3", "ETC").status("APPROVED_IGNORE").history(path("APPROVED_IGNORE")).build();
        Entry reviewing = row("R4", "MEMO").status("REVIEWED").history(REVIEWED_PATH).build();
        Entry otherTable = row("R5", "X").sourceTable("legacy.legacy_other").target("public.tb_other", "x").build();
        Entry nowhere = row("R6", "Y").sourceTable("legacy.missing").build();
        CatalogSnapshot inventory = inventory("USER_ID", "USER_NM", "ETC", "MEMO", "REG_DT");

        assertThat(validator.coverage(ledger(userId, userName, ignored, reviewing, otherTable, nowhere), mapping(),
                inventory)).containsExactly(
                "R6 legacy.missing.Y(CONFIRMED): 소스 표를 inventory 에서 찾을 수 없습니다",
                "R2 legacy.legacy_user.USER_NM(CONFIRMED): 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시"
                        + " 만드세요",
                "R5 legacy.legacy_other.X(CONFIRMED): mapping 이 읽지 않는 소스 표의 확정 행입니다 — mapping-generate"
                        + " 로 다시 만드세요",
                "R4 legacy.legacy_user.MEMO(REVIEWED): 소스 표의 컬럼이 확정·이관 제외·외부 보관 중 하나로 정해지지"
                        + " 않았습니다",
                "legacy_user.REG_DT: mapping·원장 어디에도 없는 컬럼입니다 — 옮기면 확정하고, 키로만 쓰거나 옮기지"
                        + " 않으면 이관 제외(APPROVED_IGNORE)와 사유를 적으세요");
    }

    @Test
    void theMappingMustCarryExactlyTheLoadOfItsConfirmedRow() {
        Entry ymd = row("D1", "USER_ID").load(load("ymd8", nullify(DomainViolation.PLACEHOLDER_DATE, 12L))).build();
        CatalogSnapshot inventory = inventory("USER_ID");

        assertThat(validator.coverage(ledger(ymd), mapping(new ColumnMapping("USER_ID", "user_id", "ymd8", null,
                null, null, null, null, List.of(nullify(DomainViolation.PLACEHOLDER_DATE, 12L)))), inventory))
                .isEmpty();
        for (ColumnMapping drifted : List.of(
                new ColumnMapping("USER_ID", "user_id", "ymd8", null, null, null, null),
                new ColumnMapping("USER_ID", "user_id", "ymd8", null, null, null, null, null,
                        List.of(nullify(DomainViolation.PLACEHOLDER_DATE, 13L))),
                new ColumnMapping("USER_ID", "user_id", "ymd8-truncate", null, null, null, null, null,
                        List.of(nullify(DomainViolation.PLACEHOLDER_DATE, 12L))),
                new ColumnMapping("USER_ID", "user_id", "ymd8", "string", null, null, null, null,
                        List.of(nullify(DomainViolation.PLACEHOLDER_DATE, 12L))),
                new ColumnMapping("USER_ID", "user_id", "ymd8", null, "user_code", null, null, null,
                        List.of(nullify(DomainViolation.PLACEHOLDER_DATE, 12L))))) {
            assertThat(validator.coverage(ledger(ymd), mapping(drifted), inventory)).as(drifted.toString())
                    .containsExactly("legacy.legacy_user.USER_ID: mapping 의 변환(transform·type·codemap·nullify)이 원장 행"
                            + " D1 의 load 와 다릅니다 — mapping-generate 로 다시 만드세요");
        }
    }

    @Test
    void confirmedTermsAreComparedWithLiveMetaPerSchemaAndDeprecatedTermsAreRejected() {
        Entry missing = row("M1", "A").target("public.x", "user_id").build();
        Entry renamed = row("M2", "B").target("app.x", "user_id").build();
        Entry proposed = row("M3", "C").term(new StandardTerm("없음", "NONE", "X")).status("PROPOSED")
                .history(List.of()).build();

        assertThat(validator.live(ledger(missing), Map.of())).containsExactly(
                "M1: 표준 용어 USER_ID 가 live 메타에 없습니다");
        assertThat(validator.live(ledger(missing, renamed, proposed), Map.of(
                new TermKey("public", "USER_ID"), new StandardTermRecord("사용자ID", "ID V20", false),
                new TermKey("app", "user_id"), new StandardTermRecord("사용자아이디", "ID V30", true))))
                .as("같은 영문약어라도 schema 마다 다른 용어다").containsExactly(
                "M2: 표준 용어 이름이 live 메타(사용자아이디)와 다릅니다",
                "M2: 표준 도메인이 live 메타(ID V30)와 다릅니다",
                "M2: 표준 용어 USER_ID 는 폐기됐습니다");
        assertThat(validator.live(ledger(renamed), Map.of(new TermKey("public", "USER_ID"),
                new StandardTermRecord("사용자ID", "ID V20", false)))).containsExactly(
                "M2: 표준 용어 USER_ID 가 live 메타에 없습니다");
        assertThat(validator.confirmedTermsBySchema(ledger(missing, renamed, proposed)))
                .isEqualTo(Map.of("public", Set.of("USER_ID"), "app", Set.of("USER_ID")));

        // schema 를 밝히지 않은 대상 표는 대상 연결의 현재 schema 로 본다(대상 표준 계약과 같은 해석).
        Entry unqualified = row("M4", "D").target("tb_user_info", "user_id").build();
        Map<TermKey, StandardTermRecord> appTerms = Map.of(new TermKey("app", "USER_ID"),
                new StandardTermRecord("사용자ID", "ID V20", false));
        assertThat(validator.confirmedTermsBySchema(ledger(unqualified), "app"))
                .isEqualTo(Map.of("app", Set.of("USER_ID")));
        assertThat(validator.live(ledger(unqualified), appTerms, "app")).isEmpty();
        assertThat(validator.live(ledger(unqualified), appTerms)).as("현재 schema 를 모르면 public 이다")
                .containsExactly("M4: 표준 용어 USER_ID 가 live 메타에 없습니다");
    }

    @Test
    void codemapsMustExistFailOnUnmappedCodesWhenTheyTreatViolationsAndStayInsideTheAllowedValues() {
        Entry notAllowed = row("Q1", "STTS").term(STTS_CD).target("public.tb_user_info", "stts_cd")
                .load(new Load(null, null, "status", List.of())).conformance(rated(v("NOT_ALLOWED", 4))).build();
        Entry yesNo = row("Q2", "USE_AT").term(USE_YN).target("public.tb_user_info", "use_yn")
                .load(new Load(null, null, "flags", List.of())).build();
        Entry missing = row("Q3", "KIND").term(STTS_CD).target("public.tb_user_info", "stts_cd")
                .load(new Load(null, null, "absent", List.of())).build();
        Entry unverified = row("Q4", "GRADE").term(STTS_CD).target("public.tb_user_info", "stts_cd")
                .load(new Load(null, null, "status", List.of()))
                .conformance(conformance(null, List.of("ALLOWED_VALUES_UNVERIFIED"), "codemap")).build();
        TermLedger ledger = ledger(notAllowed, yesNo, missing, unverified);
        Map<String, CodeMap> codemaps = Map.of(
                "status", new CodeMap(Map.of("10", "A01", "20", "ZZZ"), UnmappedPolicy.PASSTHROUGH, null),
                "flags", new CodeMap(Map.of("1", "Y", "0", "N"), UnmappedPolicy.FALLBACK, "X"));
        Map<TermKey, StandardTermRecord> terms = Map.of(
                new TermKey("public", "STTS_CD"), new StandardTermRecord("상태코드", "코드C3", false, "A01 : 신청, B01 : 승인"),
                new TermKey("public", "USE_YN"), new StandardTermRecord("사용여부", "여부C1", false, "Y : 예, N : 아니오"));

        assertThat(validator.codemaps(ledger, codemaps, terms)).containsExactly(
                "Q1: 위반·허용값 확인을 codemap 으로 처리하면 그 codemap 은 unmapped: fail 이어야 합니다",
                "Q1: codemap 이 내는 표준 코드가 표준 용어 STTS_CD 의 허용값 밖에 있습니다",
                "Q2: codemap 이 내는 표준 코드가 표준 용어 USE_YN 의 허용값 밖에 있습니다",
                "Q3: load.codemap 이 mapping 의 codemaps 에 없습니다",
                "Q4: 위반·허용값 확인을 codemap 으로 처리하면 그 codemap 은 unmapped: fail 이어야 합니다",
                "Q4: codemap 이 내는 표준 코드가 표준 용어 STTS_CD 의 허용값 밖에 있습니다");

        Map<String, CodeMap> fixed = Map.of(
                "status", new CodeMap(Map.of("10", "A01", "20", "B01"), UnmappedPolicy.FAIL, null),
                "flags", new CodeMap(Map.of("1", "Y", "0", "N"), UnmappedPolicy.FAIL, null, NullPolicy.KEEP),
                "absent", CodeMap.of(Map.of("1", "A01")));
        assertThat(validator.codemaps(ledger, fixed, terms)).isEmpty();
        Entry unverifiedNoted = row("Q4", "GRADE").term(STTS_CD).target("public.tb_user_info", "stts_cd")
                .load(new Load(null, null, "status", List.of()))
                .conformance(conformance(null, List.of("ALLOWED_VALUES_UNVERIFIED"), "codemap")).note("대사는 L4")
                .build();
        assertThat(validator.codemaps(ledger(unverifiedNoted), Map.of("status",
                new CodeMap(Map.of("10", "ZZZ"), UnmappedPolicy.PASSTHROUGH, null)),
                Map.of(new TermKey("public", "STTS_CD"), new StandardTermRecord("상태코드", "코드C3", false,
                        "A01 : 신청 …")))).as("읽을 수 없는 허용값은 대조하지 않는다").isEmpty();
        assertThat(validator.codemaps(ledger(unverifiedNoted), Map.of("status",
                new CodeMap(Map.of("10", "ZZZ"), UnmappedPolicy.PASSTHROUGH, null)), terms))
                .as("사유로 확정한 행(U3)도 허용값을 읽을 수 있으면 codemap 출력을 대조한다").containsExactly(
                "Q4: codemap 이 내는 표준 코드가 표준 용어 STTS_CD 의 허용값 밖에 있습니다");

        // 공백도 codemap 이 처리하면 그 codemap 은 미매핑에 멈춰야 한다 — passthrough 면 공백이 그대로 간다.
        Entry blank = row("Q5", "KIND").term(STTS_CD).target("public.tb_user_info", "stts_cd")
                .load(new Load(null, null, "blanks", List.of())).conformance(rated(v("BLANK", 2))).build();
        assertThat(validator.codemaps(ledger(blank), Map.of("blanks",
                new CodeMap(Map.of("", "A01"), UnmappedPolicy.PASSTHROUGH, null)), Map.of())).containsExactly(
                "Q5: 위반·허용값 확인을 codemap 으로 처리하면 그 codemap 은 unmapped: fail 이어야 합니다");
        assertThat(validator.codemaps(ledger(blank), Map.of("blanks",
                new CodeMap(Map.of("", "A01"), UnmappedPolicy.FAIL, null)), Map.of())).isEmpty();
    }

    private static Row row(String id, String column) {
        return new Row(id, column);
    }

    private static Row nonStandard(String id, String column, String target) {
        return row(id, column).term(null).nonStandard(new NonStandardTarget("표준 용어가 없는 이진 컬럼"))
                .target("public.tb_user_info", target).grade("UNKNOWN").conformance(null);
    }

    private static MappingSpec.Nullify nullify(DomainViolation violation, Long maxRows) {
        return new MappingSpec.Nullify(violation, maxRows);
    }

    private static Load load(String transform, MappingSpec.Nullify... nullify) {
        return new Load(transform, null, null, List.of(nullify));
    }

    private static ViolationCount v(String type, long rows) {
        return new ViolationCount(type, rows);
    }

    private static ApprovedExceptions approved(String... codes) {
        return new ApprovedExceptions(10L, "원천 정정 대기", List.of(codes));
    }

    private static Conformance rated(ViolationCount... violations) {
        return new Conformance(BigDecimal.valueOf(100), List.of(), null, List.of(violations), null);
    }

    private static Conformance rated(ApprovedExceptions exceptions, ViolationCount... violations) {
        return new Conformance(new BigDecimal("99.0"), List.of(), null, List.of(violations), exceptions);
    }

    private static Conformance conformance(String rate, List<String> unmeasured, String hint) {
        return new Conformance(rate == null ? null : new BigDecimal(rate), unmeasured, hint, List.of(), null);
    }

    private static List<Transition> path(String status) {
        return List.of(new Transition("REVIEWED", "검토자", "2026-10-01"), new Transition(status, "업무담당", "2026-10-02"));
    }

    private static MappingSpec mapping() {
        return mapping(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null));
    }

    private static MappingSpec mapping(ColumnMapping column) {
        return new MappingSpec(null, null, List.of(new TableMapping("legacy.legacy_user", "public.tb_user_info",
                null, "USER_ID", "user_id", List.of(column), null)), Map.of());
    }

    /** USER_ID 를 옮기고 legacy_other 를 별칭 oth 로 조회하는 매핑 users(ADR-0029 L3d). */
    private static MappingSpec lookupMapping(ColumnMapping lookupColumn) {
        Lookup other = new Lookup("oth", "legacy.legacy_other", null, new LookupKey("USER_ID", "Y"),
                LookupCardinality.EXACTLY_ONE, null);
        return new MappingSpec(null, null, List.of(new TableMapping("legacy.legacy_user", "public.tb_user_info", null,
                "USER_ID", List.of(), "user_id", List.of(new ColumnMapping("USER_ID", "user_id", null, null, null,
                null, null), lookupColumn), null, null, List.of(), "users", List.of(other))), Map.of());
    }

    /** legacy.legacy_user(USER_ID·ETC)와 컬럼 X·Y 인 legacy.legacy_other. */
    private static CatalogSnapshot lookupInventory() {
        List<CatalogObject> objects = new ArrayList<>(List.of(table("legacy_user"), table("legacy_other"),
                column("legacy_user", "USER_ID", 1), column("legacy_user", "ETC", 2),
                column("legacy_other", "X", 1), column("legacy_other", "Y", 2)));
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-14T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    /** legacy.legacy_user(컬럼은 정의 순서대로)와 컬럼 X 하나인 legacy.legacy_other. */
    private static CatalogSnapshot inventory(String... columns) {
        List<CatalogObject> objects = new ArrayList<>();
        objects.add(table("legacy_user"));
        objects.add(table("legacy_other"));
        for (int index = 0; index < columns.length; index++) {
            objects.add(column("legacy_user", columns[index], index + 1));
        }
        objects.add(column("legacy_other", "X", 1));
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-14T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static CatalogObject table(String name) {
        return new CatalogObject(ObjectKind.TABLE, "db", "legacy", name, false, null, null, List.of(), Map.of());
    }

    private static CatalogObject column(String table, String name, int ordinal) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", table + "." + name, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", table)),
                Map.of("parentTable", table, "originalName", name, "jdbcType", "12",
                        "ordinal", Integer.toString(ordinal)));
    }

    private static TermLedger ledger(Entry... entries) {
        return new TermLedger(TermLedger.CURRENT_SCHEMA_VERSION, new ArrayList<>(Arrays.asList(entries)));
    }

    /** 확정 행 기본값(표준 용어 USER_ID, 대상 일치, 적합률 100, 변환 없음)에서 바꿀 칸만 바꾼다. */
    private static final class Row {
        private final String id;
        private ColumnRef source;
        private String mapping;
        private Via via;
        private ColumnRef target;
        private StandardTerm term = USER_ID;
        private NonStandardTarget nonStandard;
        private String grade = "EXACT";
        private String status = "CONFIRMED";
        private Load load = NONE;
        private Conformance conformance = rated();
        private Archive archive;
        private String note;
        private List<Transition> history = CONFIRMED_PATH;
        private boolean targetSet;

        private Row(String id, String column) {
            this.id = id;
            this.source = new ColumnRef("legacy.legacy_user", column);
        }

        Row source(ColumnRef value) {
            source = value;
            return this;
        }

        Row sourceTable(String table) {
            source = new ColumnRef(table, source.column());
            return this;
        }

        Row mapping(String value) {
            mapping = value;
            return this;
        }

        Row via(Via value) {
            via = value;
            return this;
        }

        Row target(String table, String column) {
            target = new ColumnRef(table, column);
            targetSet = true;
            return this;
        }

        Row target(ColumnRef value) {
            target = value;
            targetSet = true;
            return this;
        }

        Row term(StandardTerm value) {
            term = value;
            return this;
        }

        Row nonStandard(NonStandardTarget value) {
            nonStandard = value;
            return this;
        }

        Row grade(String value) {
            grade = value;
            return this;
        }

        Row status(String value) {
            status = value;
            return this;
        }

        Row load(Load value) {
            load = value;
            return this;
        }

        Row conformance(Conformance value) {
            conformance = value;
            return this;
        }

        Row archive(Archive value) {
            archive = value;
            return this;
        }

        Row note(String value) {
            note = value;
            return this;
        }

        Row history(List<Transition> value) {
            history = value;
            return this;
        }

        Entry build() {
            ColumnRef resolved = targetSet ? target
                    : new ColumnRef("public.tb_user_info", term == null ? "user_id" : term.engAbbr().toLowerCase());
            return new Entry(id, source, mapping, via, resolved, term, nonStandard, grade, status, load, conformance,
                    archive, note, history);
        }
    }
}
