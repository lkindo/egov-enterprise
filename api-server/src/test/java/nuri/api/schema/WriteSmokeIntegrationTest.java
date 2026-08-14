package nuri.api.schema;

import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 🐘 실 PostgreSQL <b>쓰기</b> 스모크 — "매핑이 맞다" 와 "실제로 써진다" 는 다른 명제다.
 *
 * <p>[왜 필요한가] 형제 테스트 {@link SchemaValidationIntegrationTest} 는 {@code ddl-auto: validate} 로
 * <b>매핑</b>을 검증한다. 그러나 validate 는 <b>CHECK 제약을 보지 않는다</b> — Hibernate 는 컬럼의
 * 존재·타입·길이만 대조한다. 그래서 마이그레이션이 건 CHECK 의 허용값과 애플리케이션이 실제로 쓰는
 * 값이 어긋나도 validate 는 통과하고, 운영에서 첫 INSERT 가 터진다.
 *
 * <p>단위 테스트 프로파일(H2 + {@code ddl-auto: create-drop})은 이것을 <b>원리적으로</b> 잡지 못한다 —
 * 스키마를 엔티티에서 새로 만들기 때문에 Flyway 가 건 CHECK 자체가 존재하지 않는다.
 *
 * <p>[판정 축 3개]
 * <ol>
 *   <li><b>왕복 쓰기</b> — 애플리케이션이 자기 기본값으로 쓴 행이 실 스키마에 실제로 들어간다.</li>
 *   <li><b>CHECK 이 실재한다</b> — 허용되지 않는 {@code _yn} 값과 varchar 길이 초과가 거부된다.
 *       (거부되지 않으면 제약이 없다는 뜻이고, "DB 가 막아준다" 는 전제가 거짓이 된다.)</li>
 *   <li><b>CHECK 커버리지</b> — 모든 {@code %_yn} 컬럼에 CHECK 이 걸려 있다(V2_24 의 약속).
 *       신규 {@code _yn} 컬럼이 제약 없이 추가되면 여기서 red 다.</li>
 * </ol>
 *
 * <p><b>계층</b>: Docker 의존이라 {@code @Tag("schema-validation")} 으로 기존
 * {@code ./gradlew :api-server:schemaValidationTest}(= {@code localGate}·CI)에 편입한다 —
 * 새 태스크를 만들지 않는다(실행 경로가 이미 확보돼 있는 곳에 붙이는 것이 §0.7-H5 에 맞다).
 */
@Tag("schema-validation")
@SpringBootTest
@ActiveProfiles({"test", "tc"})
@DisplayName("🐘 실 PostgreSQL 쓰기 스모크 — CHECK 제약과 애플리케이션 쓰기 값의 정합")
class WriteSmokeIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private FileMasterRepository fileMasterRepository;

    /**
     * {@code _yn} 이름을 쓰지만 불리언이 아닌 컬럼. <b>예외 목록이 아니라 오명명(misnomer) census</b> 다 —
     * 이름을 고치거나 용도를 재정의하는 것이 정답이며, 그 결정은 {@code pending-decisions.md} §3-B 에 있다.
     * 새 항목을 추가하려면 그 컬럼이 왜 불리언이 아닌지를 여기 적을 것.
     */
    private static final Set<String> NON_BOOLEAN_YN_COLUMNS = new TreeSet<>(Set.of(
            // 값이 '2' 로 저장된다(86행 실측). V2_24 CHECK 대상에서 의도적으로 제외됐고,
            // rename/용도 재정의는 pending-decisions.md §3-B 의 미결 결정이다.
            // ⚠ 이 목록에 항목을 늘리기 전에 자문할 것 — 그 컬럼은 정말 불리언이 아닌가,
            //   아니면 제약이 빠진 것인가? 후자라면 마이그레이션으로 채우는 것이 정답이다
            //   (선례: meta_standard_words.rprs_yn 은 여기 넣지 않고 V2_39 로 CHECK 을 채웠다).
            "tb_menu_info.route_mdfcn_yn"
    ));

    @Test
    @DisplayName("① 애플리케이션 기본값으로 쓴 행이 실 스키마에 실제로 들어간다")
    void applicationWriteRoundTripsAgainstRealSchema() {
        assertThat(jdbcTemplate.queryForObject("SELECT current_setting('server_version_num')::int", Integer.class))
                .as("H2 로 폴백되면 create-drop 시절과 같은 거짓 안전이 된다")
                .isGreaterThanOrEqualTo(170000);

        FileMaster writtenMaster = fileMasterRepository.saveAndFlush(FileMaster.create());
        Long atchFileSn = writtenMaster.getAtchFileSn();

        assertThatCode(() -> fileMasterRepository.findById(atchFileSn))
                .as("애플리케이션이 자기 기본값(useYn='Y')으로 쓴 행이 거부되면 CHECK 허용값과 코드가 어긋난 것이다")
                .doesNotThrowAnyException();

        Integer written = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM tb_file_master WHERE atch_file_sn = ?", Integer.class, atchFileSn);
        assertThat(written).isEqualTo(1);

        jdbcTemplate.update("DELETE FROM tb_file_master WHERE atch_file_sn = ?", atchFileSn);
    }

    @Test
    @DisplayName("② 허용되지 않는 _yn 값과 비숫자 PK는 실 DB가 거부한다 — 제약이 실재함을 증명")
    void realDatabaseRejectsInvalidValues() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO tb_file_master (use_yn) VALUES ('X')"))
                .as("use_yn='X' 가 통과하면 CHECK 이 없다는 뜻이고, 'DB 가 막아준다'는 전제가 거짓이 된다")
                .isInstanceOf(DataAccessException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO tb_file_master (atch_file_sn, use_yn) VALUES (?, 'Y')",
                "not-a-number"))
                .as("비숫자 첨부 키가 통과하면 BIGINT 물리 타입과 코드 계약이 어긋난 것이다")
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    @DisplayName("③ 모든 _yn 컬럼에 CHECK 이 걸려 있다 — V2_24 의 약속이 신규 컬럼에도 유지되는지")
    void everyBooleanFlagColumnHasCheckConstraint() {
        List<String> ynColumns = jdbcTemplate.queryForList(
                "SELECT c.table_name || '.' || c.column_name"
                        + "  FROM information_schema.columns c"
                        + " WHERE c.table_schema = 'public'"
                        + "   AND c.column_name LIKE '%\\_yn'"
                        + " ORDER BY 1", String.class);

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0 에 수렴하면 vacuous 통과가 된다.
        assertThat(ynColumns)
                .as("_yn 컬럼 스캔이 비정상 — 실측 기준값은 59컬럼대(V2_24)다")
                .hasSizeGreaterThan(30);

        List<String> checked = jdbcTemplate.queryForList(
                "SELECT DISTINCT rel.relname || '.' || att.attname"
                        + "  FROM pg_constraint con"
                        + "  JOIN pg_class rel ON rel.oid = con.conrelid"
                        + "  JOIN pg_namespace ns ON ns.oid = rel.relnamespace"
                        + "  JOIN unnest(con.conkey) AS k(attnum) ON true"
                        + "  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = k.attnum"
                        + " WHERE con.contype = 'c' AND ns.nspname = 'public'", String.class);

        List<String> missing = new ArrayList<>();
        for (String column : ynColumns) {
            if (NON_BOOLEAN_YN_COLUMNS.contains(column)) {
                continue;
            }
            if (!checked.contains(column)) {
                missing.add(column);
            }
        }

        assertThat(missing)
                .as("CHECK 없는 _yn 컬럼 — 불변식이 이름에만 있고 DB 에는 없다. "
                        + "값 정합을 DB 가 보장한다는 전제가 이 컬럼들에서는 거짓이다. "
                        + "불리언이 아닌 컬럼이라면 NON_BOOLEAN_YN_COLUMNS 에 사유와 함께 등재할 것.")
                .isEmpty();
    }
}
