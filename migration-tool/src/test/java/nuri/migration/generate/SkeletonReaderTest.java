package nuri.migration.generate;

import nuri.migration.model.MappingLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** skeleton 읽기 — 구조·접속 자리표시 형식, const·fkRef 항목만, 원장 선언 없음(ADR-0029 L3a-2). */
class SkeletonReaderTest {

    static final String SKELETON = """
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
              - source: legacy.USER_MST
                target: tb_user_info
                orderBy: USER_SN
                columns:
                  - {source: DEPT_CD, target: ognz_id, fkRef: legacy.DEPT_MST}
                  - {target: frst_rgtr_id, const: MIGRATION}
            """;

    /** 환경 변수를 늘 돌려주는 대역 — 읽기가 치환하면 그 값이 드러난다. */
    private final SkeletonReader reader = new SkeletonReader(new MappingLoader(name -> "resolved-" + name));

    @Test
    void readsTheTreeAndTheStructureWithoutResolvingPlaceholders() {
        SkeletonReader.Skeleton skeleton = reader.read(SKELETON);

        assertThat(skeleton.tree().path("source").path("password").asText()).isEqualTo("${SRC_PW}");
        assertThat(skeleton.spec().source().password()).isEqualTo("${SRC_PW}");
        assertThat(skeleton.spec().target().url()).isEqualTo("${TGT_URL}");
        assertThat(skeleton.spec().tables()).hasSize(1);
        assertThat(skeleton.spec().tables().getFirst().columns()).hasSize(2);
        assertThat(skeleton.tree().path("tables").get(0).path("columns")).hasSize(2);
    }

    @Test
    void aPlaintextPasswordIsRefusedLikeTheMappingLoaderDoes() {
        String plaintext = SKELETON.replace("password: ${SRC_PW}", "password: hunter2-secret");

        assertThatThrownBy(() -> reader.read(plaintext))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping DB password는 평문을 허용하지 않습니다. ${NAME} 전체 값 형식으로 주입하세요")
                .hasMessageNotContaining("hunter2");
        assertThatThrownBy(() -> new MappingLoader(name -> "x").loadContent(plaintext))
                .hasMessage("mapping DB password는 평문을 허용하지 않습니다. ${NAME} 전체 값 형식으로 주입하세요");
    }

    @Test
    void placeholdersMustBeWholeValuesAndABlankPasswordStays() {
        assertThatThrownBy(() -> reader.read(SKELETON.replace("url: ${TGT_URL}", "url: jdbc:postgresql://${HOST}/db")))
                .hasMessage("mapping 환경 변수는 ${NAME} 전체 값 형식만 허용합니다");
        assertThatThrownBy(() -> reader.read(SKELETON.replace("password: ${TGT_PW}", "password: ${tgt_pw}")))
                .hasMessage("mapping DB password는 평문을 허용하지 않습니다. ${NAME} 전체 값 형식으로 주입하세요");

        SkeletonReader.Skeleton blank = reader.read(SKELETON.replace("password: ${SRC_PW}", "password: \"\""));
        assertThat(blank.spec().source().password()).isEmpty();
    }

    @Test
    void columnsHoldOnlyConstantsAndForeignKeyTranslations() {
        String generated = SKELETON.replace("      - {target: frst_rgtr_id, const: MIGRATION}",
                "      - {target: frst_rgtr_id, const: MIGRATION}\n      - {source: USER_NM, target: user_nm}");
        String transformedKey = SKELETON.replace("fkRef: legacy.DEPT_MST}", "fkRef: legacy.DEPT_MST, transform: trim}");

        assertThatThrownBy(() -> reader.read(generated))
                .hasMessage("skeleton tables[0].columns[2](legacy.USER_MST): skeleton 의 columns 에는 상수(const)·부모 키"
                        + " 번역(fkRef) 항목만 둡니다 — 나머지 컬럼은 원장의 확정 행에서 만듭니다");
        assertThatThrownBy(() -> reader.read(transformedKey))
                .hasMessage("skeleton tables[0].columns[0](legacy.USER_MST): fkRef 항목의 변환은 원장의 확정 행 load 로"
                        + " 정합니다 — transform·type·codemap·nullify·encrypt 를 두지 않습니다");
        assertThatThrownBy(() -> reader.read(SKELETON.replace("{source: DEPT_CD, target: ognz_id, ", "{source: DEPT_CD, ")))
                .hasMessage("skeleton tables[0].columns[0](legacy.USER_MST): columns 항목에는 target 이 필요합니다");
    }

    @Test
    void theLedgerDeclarationAndAnEmptyTableListAreRefused() {
        assertThatThrownBy(() -> reader.read(SKELETON + "ledger: {path: ledger.yml, sha256: abc}\n"))
                .hasMessage("skeleton 에는 ledger 를 두지 않습니다 — mapping-generate 가 원장 선언을 씁니다");
        assertThatThrownBy(() -> reader.read(SKELETON.substring(0, SKELETON.indexOf("tables:")) + "tables: []\n"))
                .hasMessage("skeleton 에는 표(tables)가 하나 이상 필요합니다");
        assertThatThrownBy(() -> reader.read(SKELETON.replace("    target: tb_user_info\n", "")))
                .hasMessage("skeleton tables[0]: 표에는 source·target 이 필요합니다");
        assertThatThrownBy(() -> reader.read(SKELETON + "unknownKey: 1\n"))
                .hasMessage("mapping YAML parsing failed");
    }
}
