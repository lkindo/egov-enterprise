package nuri.migration.generate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 원장에서 mapping 만들기(ADR-0029 L3a-2) — 트리 보존, 소스 단위 완전성, fkRef 키 정규화, 아직 실행할 수 없는 행 거부,
 * 자격·개인정보 차단, 같은 입력의 같은 바이트.
 */
public class MappingGeneratorTest {

    public static final String SKELETON = """
            source:
              url: ${SRC_URL}
              username: ${SRC_USER}
              password: ${SRC_PW}
              driver: org.postgresql.Driver
              endpointId: legacy-src
            target:
              url: ${TGT_URL}
              username: ${TGT_USER}
              password: ${TGT_PW}
              endpointId: std-target
            run:
              runId: run-1
              sourceNamespace: legacy
            tables:
              - source: legacy.DEPT_MST
                target: tb_ognz_info
                orderBy: DEPT_CD
                idStrategy: {column: ognz_id, generator: OGNZ_, sourceKey: DEPT_CD}
              - source: legacy.USER_MST
                target: tb_user_info
                orderBy: USER_SN
                idStrategy: {column: esntl_id, generator: USRCNFRM_, sourceKey: USER_SN}
                columns:
                  - {source: DEPT_CD, target: ognz_id, fkRef: legacy.DEPT_MST}
                  - {target: frst_rgtr_id, const: MIGRATION}
            codemaps:
              user_status:
                values: {"1": "P", "0": "D"}
            """;

    public static final String LEDGER = """
            schemaVersion: 2
            entries:
              - id: D1
                source: {table: legacy.DEPT_MST, column: DEPT_CD}
                grade: UNKNOWN
                status: APPROVED_IGNORE
                note: 부모 키로만 쓴다(idStrategy.sourceKey)
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: APPROVED_IGNORE, by: 업무담당, at: "2026-10-02"}]
              - id: D2
                source: {table: legacy.DEPT_MST, column: DEPT_NM}
                target: {table: tb_ognz_info, column: ognz_nm}
                term: {name: 조직명, engAbbr: OGNZ_NM, domain: 명V100}
                grade: EXACT
                status: CONFIRMED
                load: {transform: trim}
                conformance: {rate: 100}
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
              - id: U1
                source: {table: legacy.USER_MST, column: USER_SN}
                grade: UNKNOWN
                status: APPROVED_IGNORE
                note: 대리키 채번의 원천 키로만 쓴다
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: APPROVED_IGNORE, by: 업무담당, at: "2026-10-02"}]
              - id: U2
                source: {table: legacy.USER_MST, column: USER_ID}
                target: {table: tb_user_info, column: user_id}
                term: {name: 사용자ID, engAbbr: USER_ID, domain: ID V20}
                grade: EXACT
                status: CONFIRMED
                load: {}
                conformance: {rate: 100}
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
              - id: U3
                source: {table: legacy.USER_MST, column: USER_NM}
                target: {table: tb_user_info, column: user_nm}
                term: {name: 사용자명, engAbbr: USER_NM, domain: 명V100}
                grade: EXACT
                status: CONFIRMED
                load: {transform: trim}
                conformance: {rate: 100}
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
              - id: U4
                source: {table: legacy.USER_MST, column: END_YMD}
                target: {table: tb_user_info, column: end_ymd}
                term: {name: 종료일자, engAbbr: END_YMD, domain: 연월일C8}
                grade: EXACT
                status: CONFIRMED
                load: {transform: ymd8, nullify: [{violation: PLACEHOLDER_DATE, maxRows: 12}]}
                conformance:
                  rate: 99.6
                  transform: transform:ymd8
                  violations: [{type: PLACEHOLDER_DATE, rows: 12}]
                note: 99991231 자리표시는 종료일 없음으로 본다
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
              - id: U5
                source: {table: legacy.USER_MST, column: DEPT_CD}
                target: {table: tb_user_info, column: ognz_id}
                term: {name: 조직ID, engAbbr: OGNZ_ID, domain: ID V20}
                grade: EXACT
                status: CONFIRMED
                load: {transform: trim}
                conformance: {rate: 100}
                history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
              - id: H1
                source: {table: legacy.LOG_HIST, column: LOG_SN}
                grade: UNKNOWN
                status: PROPOSED
            """;

    @TempDir
    Path temp;

    private MappingGenerator generator;

    @BeforeEach
    void setUp() throws IOException {
        Path columns = temp.resolve("db_columns.json");
        Files.writeString(columns, """
                [
                  {"table_name": "tb_ognz_info", "column_name": "ognz_id"},
                  {"table_name": "tb_ognz_info", "column_name": "ognz_nm"},
                  {"table_name": "tb_user_info", "column_name": "esntl_id"},
                  {"table_name": "tb_user_info", "column_name": "user_id"},
                  {"table_name": "tb_user_info", "column_name": "user_nm"},
                  {"table_name": "tb_user_info", "column_name": "end_ymd"},
                  {"table_name": "tb_user_info", "column_name": "ognz_id"},
                  {"table_name": "tb_user_info", "column_name": "user_enrrno"},
                  {"table_name": "tb_user_info", "column_name": "frst_rgtr_id"},
                  {"table_name": "tb_user_detail", "column_name": "esntl_id"},
                  {"table_name": "tb_user_detail", "column_name": "user_nm"},
                  {"table_name": "tb_user_detail", "column_name": "dept_nm"}
                ]
                """);
        // 환경 변수를 늘 돌려주는 대역 — 생성기가 접속 값을 치환해 다시 쓰면 이 값이 출력에 드러난다.
        MappingLoader loader = new MappingLoader(name -> "resolved-secret-" + name);
        generator = new MappingGenerator(loader, new MappingValidator(new TransformerRegistry(), columns.toString()));
    }

    @Test
    void confirmedRowsBecomeColumnsAndTheRestOfTheSkeletonIsKept() {
        String text = generator.generate(SKELETON, LEDGER, "ledger.yml", inventory());

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(text);
        assertThat(mapping.source().password()).isEqualTo("${SRC_PW}");
        assertThat(mapping.target().url()).isEqualTo("${TGT_URL}");
        assertThat(mapping.run()).isEqualTo(new MappingSpec.RunContext("run-1", "legacy"));
        assertThat(mapping.tables().get(0).columns()).containsExactly(
                new ColumnMapping("DEPT_NM", "ognz_nm", "trim", null, null, null, null));
        assertThat(mapping.tables().get(0).idStrategy())
                .isEqualTo(new MappingSpec.IdStrategy("ognz_id", "OGNZ_", "DEPT_CD"));
        assertThat(mapping.tables().get(1).columns()).containsExactly(
                new ColumnMapping("DEPT_CD", "ognz_id", "trim", null, null, "legacy.DEPT_MST", null),
                new ColumnMapping(null, "frst_rgtr_id", null, null, null, null, "MIGRATION"),
                new ColumnMapping("USER_ID", "user_id", null, null, null, null, null),
                new ColumnMapping("USER_NM", "user_nm", "trim", null, null, null, null),
                new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null,
                        List.of(new MappingSpec.Nullify(DomainViolation.PLACEHOLDER_DATE, 12L))));
        assertThat(mapping.codemaps()).containsOnlyKeys("user_status");
        assertThat(mapping.ledger()).isEqualTo(new MappingSpec.LedgerBinding("ledger.yml", sha256(LEDGER)));
        assertThat(text).startsWith(MappingGenerator.HEADER);
        // 만든 mapping 은 원장의 확정 행만 옮긴다(plan·load 의 원장 coverage 와 같은 판정).
        assertThat(new TermLedgerValidator().coverage(new TermLedgerLoader().load(LEDGER), mapping, inventory()))
                .isEmpty();
    }

    @Test
    void connectionPlaceholdersStayLiteralAndNoResolvedValueIsWritten() {
        // 비밀번호가 빈 접속(신뢰 인증)도 url·username 자리표시가 그대로 남는다 — 치환한 객체를 다시 쓰면 여기서 드러난다.
        String blankPasswords = SKELETON.replace("password: ${SRC_PW}", "password: \"\"")
                .replace("password: ${TGT_PW}", "password: \"\"");
        assertThat(generator.generate(blankPasswords, LEDGER, "ledger.yml", inventory()))
                .contains("${SRC_URL}", "${SRC_USER}", "${TGT_URL}", "${TGT_USER}")
                .doesNotContain("resolved-secret-");

        String text = generator.generate(SKELETON, LEDGER, "ledger.yml", inventory());

        assertThat(text).contains("${SRC_PW}", "${SRC_URL}", "${TGT_PW}", "${TGT_USER}")
                .doesNotContain("resolved-secret-");
    }

    @Test
    void textThatLooksLikeANumberOrABooleanStaysText() {
        String skeleton = SKELETON.replace("const: MIGRATION", "const: \"0001\"")
                .replace("values: {\"1\": \"P\", \"0\": \"D\"}",
                        "values: {\"1\": \"01\", \"0\": \"yes\", \"2\": \"1.0\"}");

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(skeleton, LEDGER, "ledger.yml", inventory()));

        assertThat(mapping.tables().get(1).columns().get(1).constant()).isEqualTo("0001");
        assertThat(mapping.codemaps().get("user_status").values())
                .containsExactly(Map.entry("1", "01"), Map.entry("0", "yes"), Map.entry("2", "1.0"));
    }

    @Test
    void theSameInputsProduceTheSameBytes() {
        String first = generator.generate(SKELETON, LEDGER, "ledger.yml", inventory());
        String second = generator.generate(SKELETON, LEDGER, "ledger.yml", inventory());

        assertThat(second).isEqualTo(first);
        assertThat(generator.generate(SKELETON.replace("orderBy: USER_SN", "orderBy: \"USER_SN\""), LEDGER,
                "ledger.yml", inventory())).isEqualTo(first);
    }

    @Test
    void everyInventoryColumnOfASkeletonSourceNeedsAConfirmedOrADisposedRow() {
        CatalogSnapshot withPhone = inventory("MOBILE_NO");

        assertThatThrownBy(() -> generator.generate(SKELETON, LEDGER, "ledger.yml", withPhone))
                .isInstanceOf(MappingGenerator.Refused.class)
                .hasMessage("mapping 을 만들지 않았습니다: legacy.USER_MST.MOBILE_NO: mapping·원장 어디에도 없는"
                        + " 컬럼입니다 — 옮기면 확정하고, 키로만 쓰거나 옮기지 않으면 이관 제외(APPROVED_IGNORE)와"
                        + " 사유를 적으세요");

        String proposed = LEDGER.replace("""
                    term: {name: 사용자명, engAbbr: USER_NM, domain: 명V100}
                    grade: EXACT
                    status: CONFIRMED
                    load: {transform: trim}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """, """
                    term: {name: 사용자명, engAbbr: USER_NM, domain: 명V100}
                    grade: EXACT
                    status: REVIEWED
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}]
                """);
        assertThatThrownBy(() -> generator.generate(SKELETON, proposed, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: U3 legacy.USER_MST.USER_NM(REVIEWED): 확정되지 않은 컬럼은"
                        + " mapping 으로 만들 수 없습니다");
    }

    @Test
    void aLongRefusalShowsTwentyEntriesAndCountsTheRest() {
        String[] extra = new String[25];
        for (int index = 0; index < extra.length; index++) {
            extra[index] = "EXTRA_%02d".formatted(index);
        }

        assertThatThrownBy(() -> generator.generate(SKELETON, LEDGER, "ledger.yml", inventory(extra)))
                .hasMessageContaining("legacy.USER_MST.EXTRA_19: mapping·원장 어디에도 없는 컬럼입니다")
                .hasMessageNotContaining("EXTRA_20")
                .hasMessageEndingWith(" (외 5건)");
    }

    @Test
    void completenessCountsConfirmedRowsOfEveryMappingOfTheSource() {
        // 분할 원장: USER_NM 은 기본이 아닌 매핑(user_ext)으로만 확정됐다. 완전성은 소스 단위라 이 컬럼은 빠지지 않고,
        // 그 id 의 skeleton 표가 없다는 것만 거부한다(ADR-0029 L3c).
        String split = LEDGER.replace("""
                  - id: U3
                    source: {table: legacy.USER_MST, column: USER_NM}
                """, """
                  - id: U3
                    source: {table: legacy.USER_MST, column: USER_NM}
                    mapping: user_ext
                """);

        assertThatThrownBy(() -> generator.generate(SKELETON, split, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: U3 legacy.USER_MST.USER_NM(CONFIRMED): 확정 행의 매핑(user_ext)을"
                        + " 읽는 skeleton 표가 없습니다 — skeleton 에 그 id 의 표를 두세요");
    }

    /**
     * [ADR-0029 L3c] 한 소스 표를 둘로 나눈 skeleton — 매핑 id 마다 그 id 의 확정 행으로 컬럼을 만든다. 확장 매핑은 자기 소스를
     * fkRef 로 가리켜 기본 매핑(keymap 소유)의 대리키를 함께 쓴다.
     */
    @Test
    void aSplitSkeletonGetsTheConfirmedColumnsOfEachMappingId() {
        String skeleton = SKELETON.replace("codemaps:", """
                  - source: legacy.USER_MST
                    id: user_ext
                    target: tb_user_detail
                    orderBy: USER_SN
                    targetKey: esntl_id
                    columns:
                      - {source: USER_SN, target: esntl_id, fkRef: legacy.USER_MST}
                codemaps:""");
        String ledger = LEDGER.replace("""
                    grade: UNKNOWN
                    status: APPROVED_IGNORE
                    note: 대리키 채번의 원천 키로만 쓴다
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: APPROVED_IGNORE, by: 업무담당, at: "2026-10-02"}]
                """, """
                    mapping: user_ext
                    target: {table: tb_user_detail, column: esntl_id}
                    term: {name: 고유ID, engAbbr: ESNTL_ID, domain: ID V20}
                    grade: EXACT
                    status: CONFIRMED
                    load: {}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """).replace("""
                    source: {table: legacy.USER_MST, column: USER_NM}
                    target: {table: tb_user_info, column: user_nm}
                """, """
                    source: {table: legacy.USER_MST, column: USER_NM}
                    mapping: user_ext
                    target: {table: tb_user_detail, column: user_nm}
                """);

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(skeleton, ledger, "ledger.yml", inventory()));

        assertThat(mapping.tables()).extracting(MappingSpec.TableMapping::id).containsExactly(null, null, "user_ext");
        assertThat(mapping.tables().get(1).columns()).extracting(ColumnMapping::target)
                .containsExactly("ognz_id", "frst_rgtr_id", "user_id", "end_ymd");
        assertThat(mapping.tables().get(2).columns()).containsExactly(
                new ColumnMapping("USER_SN", "esntl_id", null, null, null, "legacy.USER_MST", null),
                new ColumnMapping("USER_NM", "user_nm", "trim", null, null, null, null));
        assertThat(new TermLedgerValidator().coverage(new TermLedgerLoader().load(ledger), mapping, inventory()))
                .isEmpty();

        // 같은 id 의 skeleton 표가 둘이면 매핑 키가 겹친다.
        String twice = skeleton.replace("codemaps:", """
                  - source: LEGACY.USER_MST
                    id: user_ext
                    target: tb_user_detail
                codemaps:""");
        assertThatThrownBy(() -> generator.generate(twice, ledger, "ledger.yml", inventory()))
                .hasMessageContaining("skeleton: 중복 소스 테이블 매핑 금지: 'LEGACY.USER_MST#user_ext'");
    }

    @Test
    void rowsTheRuntimeCannotRunYetAndConfirmedRowsOutsideTheSkeletonAreRefused() {
        String archived = LEDGER.replace("""
                    source: {table: legacy.USER_MST, column: USER_ID}
                """, """
                    source: {table: legacy.USER_MST, column: USER_ID}
                    via: {mapping: orders, lookup: cust}
                """).replace("""
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: PROPOSED
                """, """
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    target: {table: tb_user_info, column: user_enrrno}
                    term: {name: 주민등록번호, engAbbr: USER_ENRRNO, domain: 주민등록번호V256}
                    grade: EXACT
                    status: CONFIRMED
                    load: {}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """);

        assertThatThrownBy(() -> generator.generate(SKELETON, archived, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: U2 legacy.USER_MST.USER_ID(CONFIRMED): 조회"
                        + " 경로(orders/cust)를 선언한 skeleton 표가 없습니다 — skeleton 의 그 id 의 표에 lookups 를 두세요"
                        + " | H1 legacy.LOG_HIST.LOG_SN(CONFIRMED): skeleton 에 없는 소스 표의 확정 행입니다 — skeleton 에"
                        + " 그 표를 두세요")
                .hasMessageNotContaining("APPROVED_IGNORE 로");
    }

    /**
     * [ADR-0029 L3d] 조회 경로(via) 확정 행은 skeleton 의 그 id 의 표가 선언한 별칭으로 {@code alias.COLUMN} 컬럼이 된다. 같은
     * 컬럼을 직접 옮기는 행(D2)과 조회로 옮기는 행(X1)은 따로 확정된다. 조회만 하는 표도 완전해야 한다.
     */
    @Test
    void viaRowsBecomeLookupColumnsOfTheSkeletonTableThatDeclaresTheAlias() {
        String skeleton = SKELETON.replace("codemaps:", """
                  - source: legacy.USER_MST
                    id: user_dept
                    target: tb_user_detail
                    orderBy: USER_SN
                    targetKey: esntl_id
                    columns:
                      - {source: USER_SN, target: esntl_id, fkRef: legacy.USER_MST}
                    lookups:
                      - {alias: dept, source: legacy.DEPT_MST, key: {from: DEPT_CD, to: DEPT_CD}, cardinality: exactly_one}
                codemaps:""");
        String ledger = LEDGER.replace("""
                    grade: UNKNOWN
                    status: APPROVED_IGNORE
                    note: 대리키 채번의 원천 키로만 쓴다
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: APPROVED_IGNORE, by: 업무담당, at: "2026-10-02"}]
                """, """
                    mapping: user_dept
                    target: {table: tb_user_detail, column: esntl_id}
                    term: {name: 고유ID, engAbbr: ESNTL_ID, domain: ID V20}
                    grade: EXACT
                    status: CONFIRMED
                    load: {}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """) + """
                  - id: X1
                    source: {table: legacy.DEPT_MST, column: DEPT_NM}
                    via: {mapping: user_dept, lookup: dept}
                    target: {table: tb_user_detail, column: dept_nm}
                    term: {name: 부서명, engAbbr: DEPT_NM, domain: 명V100}
                    grade: EXACT
                    status: CONFIRMED
                    load: {transform: trim}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """;

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(skeleton, ledger, "ledger.yml", inventory()));

        assertThat(mapping.tables().get(2).id()).isEqualTo("user_dept");
        assertThat(mapping.tables().get(2).columns()).containsExactly(
                new ColumnMapping("USER_SN", "esntl_id", null, null, null, "legacy.USER_MST", null),
                new ColumnMapping("dept.DEPT_NM", "dept_nm", "trim", null, null, null, null));
        assertThat(mapping.tables().get(2).lookups()).containsExactly(new MappingSpec.Lookup("dept", "legacy.DEPT_MST",
                null, new MappingSpec.LookupKey("DEPT_CD", "DEPT_CD"), MappingSpec.LookupCardinality.EXACTLY_ONE, null));
        assertThat(mapping.tables().get(0).columns()).containsExactly(
                new ColumnMapping("DEPT_NM", "ognz_nm", "trim", null, null, null, null));
        assertThat(new TermLedgerValidator().coverage(new TermLedgerLoader().load(ledger), mapping, inventory()))
                .isEmpty();

        // 별칭이 다른 표를 읽으면 그 행을 조회 컬럼으로 만들지 않는다.
        String otherTable = skeleton.replace("source: legacy.DEPT_MST, key", "source: legacy.LOG_HIST, key");
        assertThatThrownBy(() -> generator.generate(otherTable, ledger, "ledger.yml", inventory()))
                .hasMessageContaining("X1 legacy.DEPT_MST.DEPT_NM(CONFIRMED): 조회 경로의 조회 표(legacy.LOG_HIST)가 원장 행의"
                        + " 소스 표와 다릅니다")
                // 조회만 하는 표도 완전해야 한다 — LOG_HIST 의 확정되지 않은 행이 그대로 드러난다.
                .hasMessageContaining("H1 legacy.LOG_HIST.LOG_SN(PROPOSED): 확정되지 않은 컬럼은 mapping 으로 만들 수"
                        + " 없습니다");
    }

    @Test
    void archiveRowsOfAMappedTableBecomeOneDeclarationPerRetention() {
        // [ADR-0029 L3e] (소스 표, 보존 기한) 마다 선언 하나 — 컬럼은 inventory 정의 순서, 기한은 이른 것부터.
        String ledger = LEDGER.replace("  - id: H1\n", archiveRows("legacy.USER_MST",
                "U7", "ETC1", "2031-12-31", "U8", "MEMO", "2030-06-30", "U9", "RMRK2", "2031-12-31") + "  - id: H1\n");

        String text = generator.generate(SKELETON, ledger, "ledger.yml", inventory("ETC1", "MEMO", "RMRK2"));

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(text);
        assertThat(mapping.archives()).containsExactly(
                new MappingSpec.ArchiveDump("legacy_user_mst_20300630", "legacy.USER_MST", null, List.of(),
                        List.of("MEMO"), List.of("U8"), "2030-06-30"),
                new MappingSpec.ArchiveDump("legacy_user_mst_20311231", "legacy.USER_MST", null, List.of(),
                        List.of("ETC1", "RMRK2"), List.of("U7", "U9"), "2031-12-31"));
        assertThat(mapping.tables().get(1).columns()).as("보관 컬럼은 적재하지 않는다")
                .noneMatch(column -> column.source() != null
                        && List.of("ETC1", "MEMO", "RMRK2").contains(column.source()));
        assertThat(generator.generate(SKELETON, ledger, "ledger.yml", inventory("ETC1", "MEMO", "RMRK2")))
                .isEqualTo(text);
        assertThat(new TermLedgerValidator().coverage(new TermLedgerLoader().load(ledger), mapping,
                inventory("ETC1", "MEMO", "RMRK2"))).isEmpty();
        assertThat(generator.generate(SKELETON, LEDGER, "ledger.yml", inventory())).as("보관 행이 없으면 archives 를"
                + " 쓰지 않는다").doesNotContain("archives");
    }

    @Test
    void aDumpOnlyTableComesFromTheSkeletonArchivesWithItsOwnOrderAndFilter() {
        String skeleton = SKELETON.replace("codemaps:", """
                archives:
                  - {source: legacy.LOG_HIST, orderByKeys: [LOG_SN], where: "LOG_SN > 0"}
                codemaps:""");
        String ledger = LEDGER.replace("""
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: PROPOSED
                """, """
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: APPROVED_IGNORE
                    note: 덤프 행의 정렬 키로만 쓴다
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: APPROVED_IGNORE, by: 업무담당, at: "2026-10-02"}]
                """ + archiveRows("legacy.LOG_HIST", "H2", "LOG_MSG", "2031-12-31"));

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(skeleton, ledger, "ledger.yml", inventoryWithLog("LOG_MSG")));

        assertThat(mapping.archives()).containsExactly(new MappingSpec.ArchiveDump("legacy_log_hist_20311231",
                "legacy.LOG_HIST", "LOG_SN > 0", List.of("LOG_SN"), List.of("LOG_MSG"), List.of("H2"), "2031-12-31"));
        assertThat(mapping.tables()).extracting(MappingSpec.TableMapping::source)
                .containsExactly("legacy.DEPT_MST", "legacy.USER_MST");

        assertThatThrownBy(() -> generator.generate(skeleton, LEDGER, "ledger.yml", inventoryWithLog("LOG_MSG")))
                .as("보관 행이 없는 덤프만 하는 표")
                .hasMessageContaining("skeleton archives[0] legacy.LOG_HIST: 외부 보관(ARCHIVE) 행이 없는 덤프만 하는"
                        + " 표입니다 — 보관할 컬럼을 원장에서 ARCHIVE 로 정하거나 skeleton 의 archives 에서 빼세요");
        assertThatThrownBy(() -> generator.generate(skeleton, ledger, "ledger.yml", inventoryWithLog("LOG_MSG",
                "LOG_IP"))).as("처분하지 않은 컬럼").hasMessage("mapping 을 만들지 않았습니다: legacy.LOG_HIST.LOG_IP: 덤프만"
                + " 하는 표의 컬럼이 원장에 없습니다 — 보관하면 외부 보관(ARCHIVE), 정렬 키로만 쓰거나 보관하지 않으면 이관"
                + " 제외(APPROVED_IGNORE)와 사유를 적으세요(정렬 키 값은 덤프 행마다 원값으로 실리고 그 표 외부 보관 행의"
                + " 개인정보 확인이 덮습니다)");
        assertThatThrownBy(() -> generator.generate(skeleton.replace("orderByKeys: [LOG_SN]", "orderByKeys: [NO_KEY]"),
                ledger, "ledger.yml", inventoryWithLog("LOG_MSG"))).hasMessage("mapping 을 만들지 않았습니다: skeleton"
                + " archives[0] legacy.LOG_HIST: 정렬 키 NO_KEY 가 inventory 의 이 표에 없습니다");
        assertThatThrownBy(() -> generator.generate(skeleton.replace("source: legacy.LOG_HIST, orderByKeys",
                "source: USER_MST, orderByKeys"), ledger, "ledger.yml", inventoryWithLog("LOG_MSG")))
                .as("다른 표기의 매핑된 표").hasMessageContaining("skeleton archives[0] USER_MST: skeleton tables[1]"
                        + " 가 매핑하는 표입니다 — 그 표의 보관은 원장 ARCHIVE 행으로 만들고 매핑의 where·정렬을 씁니다");
    }

    @Test
    void archiveRowsOutsideTheSkeletonAndUnacknowledgedRowsAreRefused() {
        String outside = LEDGER.replace("""
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: PROPOSED
                """, archiveRows("legacy.LOG_HIST", "H1", "LOG_SN", "2031-12-31"));
        assertThatThrownBy(() -> generator.generate(SKELETON, outside, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: H1 legacy.LOG_HIST.LOG_SN(ARCHIVE): skeleton 에 없는 소스 표의"
                        + " 외부 보관 행입니다 — 매핑하는 표면 skeleton 의 tables 에, 덤프만 하는 표면 skeleton 의 archives"
                        + " 에 그 표를 두세요")
                .hasMessageNotContaining("APPROVED_IGNORE");

        // [DEC-OPS-321 U2] 사람 확인 없는 외부 보관 행은 원장 검증에서 멈춘다(plan 도 같은 검증이다).
        String unacknowledged = LEDGER.replace("  - id: H1\n", archiveRows("legacy.USER_MST", "U7", "ETC1",
                "2031-12-31").replace(", personalData: acknowledged", "") + "  - id: H1\n");
        assertThatThrownBy(() -> generator.generate(SKELETON, unacknowledged, "ledger.yml", inventory("ETC1")))
                .hasMessage("mapping 을 만들지 않았습니다: U7: 외부 보관에는 덤프(정렬 키 값 포함)가 주민등록번호·전화번호·"
                        + "이메일 모양 값을 가리지 않고 기관 통제 아래 남긴다는 사람 확인(archive.personalData: acknowledged)이"
                        + " 필요합니다");
    }

    @Test
    void archiveIdsAreDerivedFromTheTableAndTheRetentionAndStayUnique() {
        java.util.Set<String> taken = new java.util.HashSet<>();

        assertThat(MappingGenerator.archiveId("legacy_USER-MST", "2031-12-31", taken))
                .isEqualTo("legacy_user_mst_20311231");
        assertThat(MappingGenerator.archiveId("legacy.user mst", "2031-12-31", taken))
                .isEqualTo("legacy_user_mst_20311231_2");
        assertThat(MappingGenerator.archiveId("9쪽_로그", "2031-12-31", taken)).isEqualTo("archive_9_20311231");
        assertThat(MappingGenerator.archiveId("사용자", "2031-12-31", taken)).isEqualTo("archive_20311231");
        assertThat(MappingGenerator.archiveId("x".repeat(80), "2031-12-31", taken)).hasSize(63)
                .isEqualTo("x".repeat(54) + "_20311231");
    }

    /** {@code (id, column, retainUntil)} 세 개씩 받아 표의 외부 보관 행을 만든다(사람 확인 포함). */
    private static String archiveRows(String table, String... triples) {
        StringBuilder rows = new StringBuilder();
        for (int index = 0; index < triples.length; index += 3) {
            rows.append("""
                      - id: %s
                        source: {table: %s, column: %s}
                        grade: UNKNOWN
                        status: ARCHIVE
                        archive: {retainUntil: "%s", personalData: acknowledged}
                        history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: ARCHIVE, by: 업무담당, at: "2026-10-02"}]
                    """.formatted(triples[index], table, triples[index + 1], triples[index + 2]));
        }
        return rows.toString();
    }

    /** {@link #inventory()} 에 LOG_HIST 컬럼을 더한다. */
    private static CatalogSnapshot inventoryWithLog(String... extra) {
        CatalogSnapshot base = inventory();
        CatalogObject log = base.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE && object.name().equals("LOG_HIST"))
                .findFirst().orElseThrow();
        List<CatalogObject> objects = new ArrayList<>(base.objects());
        for (int index = 0; index < extra.length; index++) {
            objects.add(column(log, extra[index], 2 + index));
        }
        return new CatalogSnapshot(base.schemaVersion(), base.discoveredAt(), base.database(), base.environment(),
                base.snapshotCapability(), objects, base.visibilityFindings());
    }

    @Test
    void aSkeletonTableWithoutLedgerRowsAndAnUnresolvableTableAreRefused() {
        String withLog = SKELETON.replace("codemaps:", """
                  - source: legacy.LOG_HIST
                    target: tb_user_info
                  - source: legacy.NO_SUCH
                    target: tb_user_info
                codemaps:""");
        String noLogRows = LEDGER.substring(0, LEDGER.indexOf("  - id: H1"));

        assertThatThrownBy(() -> generator.generate(withLog, noLogRows, "ledger.yml", inventory()))
                .hasMessageContaining("skeleton tables[3] legacy.NO_SUCH: 소스 표를 inventory 에서 찾을 수 없습니다")
                .hasMessageContaining("skeleton tables[2] legacy.LOG_HIST: 원장 행이 없는 표입니다");
    }

    @Test
    void aForeignKeyColumnTakesOnlyKeyNormalizingLoads() {
        String domainKey = LEDGER.replace("""
                    term: {name: 조직ID, engAbbr: OGNZ_ID, domain: ID V20}
                    grade: EXACT
                    status: CONFIRMED
                    load: {transform: trim}
                """, """
                    term: {name: 조직ID, engAbbr: OGNZ_ID, domain: ID V20}
                    grade: EXACT
                    status: CONFIRMED
                    load: {transform: ymd8}
                """);
        String codedKey = domainKey.replace("load: {transform: ymd8}", "load: {codemap: user_status}");
        String typedKey = domainKey.replace("load: {transform: ymd8}", "load: {transform: upper, type: string}");

        String refusal = "mapping 을 만들지 않았습니다: U5 legacy.USER_MST.DEPT_CD(CONFIRMED): fkRef 컬럼의 load 는 키를"
                + " 정규화하는 처리(trim·upper·lower·문자 type)만 받습니다 — 표준 도메인 변환기·codemap·nullify 는 부모"
                + " 키를 바꿉니다";
        assertThatThrownBy(() -> generator.generate(SKELETON, domainKey, "ledger.yml", inventory()))
                .hasMessage(refusal);
        assertThatThrownBy(() -> generator.generate(SKELETON, codedKey, "ledger.yml", inventory()))
                .hasMessageStartingWith(refusal);
        MappingSpec typed = new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(SKELETON, typedKey, "ledger.yml", inventory()));
        assertThat(typed.tables().get(1).columns().getFirst())
                .isEqualTo(new ColumnMapping("DEPT_CD", "ognz_id", "upper", "string", null, "legacy.DEPT_MST", null));
    }

    @Test
    void aConstantAndAConfirmedRowCannotFillTheSameTargetColumn() {
        String overlapping = SKELETON.replace("{target: frst_rgtr_id, const: MIGRATION}",
                "{target: user_nm, const: MIGRATION}");

        assertThatThrownBy(() -> generator.generate(overlapping, LEDGER, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: legacy.USER_MST: 같은 대상 컬럼(user_nm)을 두 항목이 채웁니다"
                        + " — 상수(const) 항목, 원장 행 U3");
    }

    @Test
    void aProtectedTargetGetsItsEncryptionDeclaration() {
        String rrn = LEDGER.replace("""
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: PROPOSED
                """, """
                  - id: U6
                    source: {table: legacy.USER_MST, column: RRN}
                    target: {table: tb_user_info, column: user_enrrno}
                    term: {name: 주민등록번호, engAbbr: USER_ENRRNO, domain: 주민등록번호V256}
                    grade: EXACT
                    status: CONFIRMED
                    load: {}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """);

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(SKELETON, rrn, "ledger.yml", inventory("RRN")));

        assertThat(mapping.tables().get(1).columns()).last()
                .isEqualTo(new ColumnMapping("RRN", "user_enrrno", null, null, null, null, null, "aria-egov-v1"));
    }

    @Test
    void confirmedRowsMustTargetTheSkeletonTableAndAColumnTheToolCanProduce() {
        String withLog = SKELETON.replace("codemaps:", """
                  - source: legacy.LOG_HIST
                    target: tb_auth_otp_cert
                codemaps:""");
        String ledger = LEDGER.replace("""
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: PROPOSED
                """, """
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    target: {table: tb_auth_otp_cert, column: otp_secret_encpt_cn}
                    term: {name: OTP비밀암호화내용, engAbbr: OTP_SECRET_ENCPT_CN, domain: 내용V4000}
                    grade: EXACT
                    status: CONFIRMED
                    load: {}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """).replace("target: {table: tb_user_info, column: user_nm}", "target: {table: tb_user_detail, column: user_nm}");

        assertThatThrownBy(() -> generator.generate(withLog, ledger, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: U3 legacy.USER_MST.USER_NM(CONFIRMED): 확정 행의 대상 표가 skeleton"
                        + " 의 대상 표(tb_user_info)와 다릅니다 | H1 legacy.LOG_HIST.LOG_SN(CONFIRMED): 이관 도구가 만들 수 없는"
                        + " 보호 컬럼으로 확정했습니다 — 온라인 앱에서 다시 만드는 값이라 옮길 수 없습니다");
    }

    @Test
    void aPlaintextPasswordSkeletonIsRefusedWithoutEchoingIt() {
        assertThatThrownBy(() -> generator.generate(SKELETON.replace("password: ${TGT_PW}", "password: pa55-word"),
                LEDGER, "ledger.yml", inventory()))
                .isInstanceOf(MappingGenerator.Refused.class)
                .hasMessage("mapping DB password는 평문을 허용하지 않습니다. ${NAME} 전체 값 형식으로 주입하세요");
    }

    @Test
    void aPersonalLookingConstantIsNotWritten() {
        String personal = SKELETON.replace("const: MIGRATION", "const: 010-1234-5678");

        assertThatThrownBy(() -> generator.generate(personal, LEDGER, "ledger.yml", inventory()))
                .isInstanceOf(MappingGenerator.Refused.class)
                .hasMessage("mapping 의 tables 에 자격·개인정보로 보이는 값이 있어 쓰지 않았습니다");
    }

    @Test
    void anInvalidLedgerIsRefusedBeforeAnythingIsBuilt() {
        assertThatThrownBy(() -> generator.generate(SKELETON, LEDGER.replace("schemaVersion: 2", "schemaVersion: 1"),
                "ledger.yml", inventory()))
                .hasMessageStartingWith("용어 매핑 원장 형식 1 은 더 이상 읽지 않습니다");
        assertThatThrownBy(() -> generator.generate(SKELETON, LEDGER.replace("    load: {}\n", ""), "ledger.yml",
                inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: U2: 확정에는 load(변환·type·codemap·nullify, 변환이 없으면 {})가"
                        + " 필요합니다");
    }

    @Test
    void theLedgerMustSitInsideTheOutputDirectory() {
        Path output = temp.resolve("out").resolve("mapping.yml");

        assertThat(MappingGenerator.ledgerPath(output, temp.resolve("out").resolve("ledger").resolve("terms.yml")))
                .isEqualTo("ledger/terms.yml");
        assertThat(MappingGenerator.ledgerPath(output, temp.resolve("out").resolve("x").resolve("..")
                .resolve("terms.yml"))).isEqualTo("terms.yml");
        assertThatThrownBy(() -> MappingGenerator.ledgerPath(output, temp.resolve("terms.yml")))
                .hasMessage("용어 매핑 원장은 출력 mapping 과 같은 디렉터리나 그 아래에 있어야 합니다");
        for (String path : List.of("../terms.yml", "/terms.yml", "a/./b.yml", "a\\b.yml", "C:x.yml", "")) {
            assertThatThrownBy(() -> generator.generate(SKELETON, LEDGER, path, inventory())).as(path)
                    .hasMessage("용어 매핑 원장 경로는 출력 mapping 디렉터리 기준의 상대 경로여야 합니다");
        }
    }

    @Test
    void approvedExceptionsNotCoveredByNullifyBecomeTheColumnsIsolation() {
        String approved = LEDGER.replace("""
                      violations: [{type: PLACEHOLDER_DATE, rows: 12}]
                """, """
                      violations: [{type: PLACEHOLDER_DATE, rows: 12}, {type: INVALID_DATE, rows: 3}]
                      approvedExceptions: {maxRows: 3, reason: 원천 정정 대기, violations: [INVALID_DATE, PLACEHOLDER_DATE]}
                """);

        String text = generator.generate(SKELETON, approved, "ledger.yml", inventory());

        MappingSpec mapping = new MappingLoader(name -> "x").parseUnresolved(text);
        assertThat(mapping.tables().get(1).columns()).last().isEqualTo(new ColumnMapping("END_YMD", "end_ymd", "ymd8",
                null, null, null, null, null, List.of(new MappingSpec.Nullify(DomainViolation.PLACEHOLDER_DATE, 12L)),
                new MappingSpec.Isolate("U4", 3L, List.of("INVALID_DATE"))));
        assertThat(mapping.tables().get(1).columns()).filteredOn(column -> !"end_ymd".equals(column.target()))
                .allSatisfy(column -> assertThat(column.isolate()).isNull());
        assertThat(generator.generate(SKELETON, approved, "ledger.yml", inventory())).isEqualTo(text);
        assertThat(new TermLedgerValidator().coverage(new TermLedgerLoader().load(approved), mapping, inventory()))
                .isEmpty();

        String allCovered = approved.replace("violations: [INVALID_DATE, PLACEHOLDER_DATE]",
                "violations: [PLACEHOLDER_DATE]").replace(", {type: INVALID_DATE, rows: 3}", "");
        assertThat(new MappingLoader(name -> "x").parseUnresolved(
                generator.generate(SKELETON, allCovered, "ledger.yml", inventory())).tables().get(1).columns())
                .as("nullify 가 모두 덮으면 격리를 쓰지 않는다").allSatisfy(column -> assertThat(column.isolate()).isNull());
    }

    @Test
    void unhandledViolationsOnATableOrColumnThatCannotIsolateAreRefusedWithoutAdvisingToIgnore() {
        String exceptions = "approvedExceptions: {maxRows: 2, reason: 원천 정정 대기, violations: [FORMAT]}";
        String parent = LEDGER.replace("""
                    load: {transform: trim}
                    conformance: {rate: 100}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                  - id: U1
                """, """
                    load: {transform: trim}
                    conformance: {rate: 100, %s}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                  - id: U1
                """.formatted(exceptions));
        String foreignKey = LEDGER.replace("""
                    term: {name: 조직ID, engAbbr: OGNZ_ID, domain: ID V20}
                    grade: EXACT
                    status: CONFIRMED
                    load: {transform: trim}
                    conformance: {rate: 100}
                """, """
                    term: {name: 조직ID, engAbbr: OGNZ_ID, domain: ID V20}
                    grade: EXACT
                    status: CONFIRMED
                    load: {transform: trim}
                    conformance: {rate: 100, %s}
                """.formatted(exceptions));
        String encrypted = LEDGER.replace("""
                  - id: H1
                    source: {table: legacy.LOG_HIST, column: LOG_SN}
                    grade: UNKNOWN
                    status: PROPOSED
                """, """
                  - id: U6
                    source: {table: legacy.USER_MST, column: RRN}
                    target: {table: tb_user_info, column: user_enrrno}
                    term: {name: 주민등록번호, engAbbr: USER_ENRRNO, domain: 주민등록번호V256}
                    grade: EXACT
                    status: CONFIRMED
                    load: {}
                    conformance: {rate: 100, %s}
                    history: [{to: REVIEWED, by: 검토자, at: "2026-10-01"}, {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}]
                """.formatted(exceptions));
        String refusal = ": 이 표는 격리할 수 없습니다 — 데이터를 바로잡거나 nullify 로 처리하세요";

        assertThatThrownBy(() -> generator.generate(SKELETON, parent, "ledger.yml", inventory()))
                .isInstanceOf(MappingGenerator.Refused.class)
                .hasMessage("mapping 을 만들지 않았습니다: D2 legacy.DEPT_MST.DEPT_NM(CONFIRMED)" + refusal
                        + "(다른 매핑이 부모로 참조하는 매핑)")
                .hasMessageNotContaining("APPROVED_IGNORE");
        assertThatThrownBy(() -> generator.generate(SKELETON, foreignKey, "ledger.yml", inventory()))
                .hasMessage("mapping 을 만들지 않았습니다: U5 legacy.USER_MST.DEPT_CD(CONFIRMED)" + refusal
                        + "(fkRef 컬럼)")
                .hasMessageNotContaining("APPROVED_IGNORE");
        assertThatThrownBy(() -> generator.generate(SKELETON, encrypted, "ledger.yml", inventory("RRN")))
                .hasMessage("mapping 을 만들지 않았습니다: U6 legacy.USER_MST.RRN(CONFIRMED)" + refusal + "(암호화 컬럼)")
                .hasMessageNotContaining("APPROVED_IGNORE");
    }

    /** USER_MST·DEPT_MST·LOG_HIST 와 그 컬럼. {@code extra} 는 USER_MST 에 더하는 컬럼이다. */
    public static CatalogSnapshot inventory(String... extra) {
        CatalogObject dept = table("DEPT_MST");
        CatalogObject user = table("USER_MST");
        CatalogObject log = table("LOG_HIST");
        // 산출물처럼 정의 순서와 다른 순서로 담는다 — 생성기는 정의 순서(ordinal)로 컬럼을 쓴다.
        List<CatalogObject> objects = new ArrayList<>(List.of(log, user, dept,
                column(dept, "DEPT_NM", 2), column(dept, "DEPT_CD", 1),
                column(user, "DEPT_CD", 5), column(user, "END_YMD", 4), column(user, "USER_NM", 3),
                column(user, "USER_ID", 2), column(user, "USER_SN", 1), column(log, "LOG_SN", 1)));
        for (int index = 0; index < extra.length; index++) {
            objects.add(column(user, extra[index], 6 + index));
        }
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-14T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("LegacyDB", "1", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static CatalogObject table(String name) {
        return new CatalogObject(ObjectKind.TABLE, "db", "legacy", name, false, null, null, List.of(), Map.of());
    }

    private static CatalogObject column(CatalogObject table, String name, int ordinal) {
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("parentTable", table.name());
        attributes.put("originalName", name);
        attributes.put("jdbcType", "12");
        attributes.put("ordinal", Integer.toString(ordinal));
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", table.name() + "." + name, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", table.name())), attributes);
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
