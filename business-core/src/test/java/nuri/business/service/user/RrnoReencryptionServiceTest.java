package nuri.business.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import nuri.business.domain.common.RrnoEncryptionConverter;
import nuri.business.domain.common.RrnoKeyring;
import nuri.foundation.core.util.CryptoUtil;
import org.egovframe.rte.fdl.crypto.EgovCryptoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("주민등록번호 재암호화")
class RrnoReencryptionServiceTest {

    private static final String KEY_OLD = Base64.getEncoder().encodeToString(new byte[32]);
    private static final String KEY_NEW;
    static {
        byte[] b = new byte[32];
        java.util.Arrays.fill(b, (byte) 9);
        KEY_NEW = Base64.getEncoder().encodeToString(b);
    }

    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private RrnoReencryptionService service;

    @BeforeEach
    void setUp() throws Exception {
        // ARIA 는 그 값의 Base64 를 '암호문'으로 돌려주는 대역으로 둔다 — 변환기가 쓰는 CryptoUtil 경로를 그대로 탄다.
        EgovCryptoService aria = Mockito.mock(EgovCryptoService.class);
        when(aria.encrypt(any(byte[].class), any(String.class))).thenAnswer(inv -> ("aria:" + new String(
                (byte[]) inv.getArgument(0), StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8));
        when(aria.decrypt(any(byte[].class), any(String.class))).thenAnswer(inv -> {
            String raw = new String((byte[]) inv.getArgument(0), StandardCharsets.UTF_8);
            if (!raw.startsWith("aria:")) throw new IllegalArgumentException("not aria");
            return raw.substring(5).getBytes(StandardCharsets.UTF_8);
        });
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", aria);
        ReflectionTestUtils.setField(CryptoUtil.class, "algorithmKey", "egovframe");
        ReflectionTestUtils.setField(CryptoUtil.class, "previousCryptoService", null);
        ReflectionTestUtils.setField(CryptoUtil.class, "previousAlgorithmKey", null);
        RrnoKeyring.configure(null, null);

        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        jdbc = new JdbcTemplate(database);
        jdbc.execute("CREATE TABLE tb_user_info (esntl_id VARCHAR(20) PRIMARY KEY, user_enrrno VARCHAR(256))");
        service = new RrnoReencryptionService(jdbc);
    }

    @AfterEach
    void tearDown() {
        RrnoKeyring.configure(null, null);
        database.shutdown();
    }

    private void insert(String id, String stored) {
        jdbc.update("INSERT INTO tb_user_info (esntl_id, user_enrrno) VALUES (?, ?)", id, stored);
    }

    private String stored(String id) {
        return jdbc.queryForObject("SELECT user_enrrno FROM tb_user_info WHERE esntl_id = ?", String.class, id);
    }

    private static String read(String stored) {
        return new RrnoEncryptionConverter().convertToEntityAttribute(stored);
    }

    @Test
    @DisplayName("키링이 없으면 실행하지 않는다 — 다시 쓸 대상 형식이 없다")
    void refusesWithoutKeyring() {
        assertThatThrownBy(() -> service.run(false)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RRNO_ACTIVE_KEY_ID");
    }

    @Test
    @DisplayName("dry-run 은 ARIA·평문·이전 키 v2 를 세기만 하고, 빈 값·활성 키 v2 는 세지 않는다")
    void dryRunCountsOnlyNonActiveValues() {
        String ariaValue = new RrnoEncryptionConverter().convertToDatabaseColumn("900101-1234567");
        RrnoKeyring.configure("old", Map.of("old", KEY_OLD));
        String oldEnvelope = RrnoKeyring.encrypt("800101-2234567");
        RrnoKeyring.configure("new", Map.of("old", KEY_OLD, "new", KEY_NEW));
        String activeEnvelope = RrnoKeyring.encrypt("700101-1234567");
        insert("U1", ariaValue);
        insert("U2", "750101-1234567");
        insert("U3", oldEnvelope);
        insert("U4", activeEnvelope);
        insert("U5", " ");
        insert("U6", null);

        var result = service.run(false);

        assertThat(result.targets()).isEqualTo(3);
        assertThat(result.rewritten()).isZero();
        assertThat(result.applied()).isFalse();
        assertThat(stored("U1")).isEqualTo(ariaValue);
        assertThat(stored("U3")).isEqualTo(oldEnvelope);
    }

    @Test
    @DisplayName("apply 는 모든 대상을 활성 키 v2 로 다시 쓰고 값은 그대로 읽힌다 — 다시 돌리면 대상이 0 이다")
    void applyRewritesEveryTargetToActiveKeyAndIsIdempotent() {
        String ariaValue = new RrnoEncryptionConverter().convertToDatabaseColumn("900101-1234567");
        RrnoKeyring.configure("old", Map.of("old", KEY_OLD));
        String oldEnvelope = RrnoKeyring.encrypt("800101-2234567");
        RrnoKeyring.configure("new", Map.of("old", KEY_OLD, "new", KEY_NEW));
        insert("U1", ariaValue);
        insert("U2", "750101-1234567");
        insert("U3", oldEnvelope);
        // 한 페이지보다 많은 행에서도 키셋 페이징이 끝까지 간다
        for (int i = 0; i < RrnoReencryptionService.CHUNK + 5; i++) {
            insert(String.format("Z%05d", i), "750101-12345" + (i % 10) + (i % 7));
        }

        var result = service.run(true);

        assertThat(result.targets()).isEqualTo(3 + RrnoReencryptionService.CHUNK + 5);
        assertThat(result.rewritten()).isEqualTo(result.targets());
        assertThat(result.changedMeanwhile()).isZero();
        for (String id : new String[] { "U1", "U2", "U3", "Z00000", String.format("Z%05d", RrnoReencryptionService.CHUNK + 4) }) {
            assertThat(RrnoKeyring.isActiveKeyEnvelope(stored(id))).as(id).isTrue();
        }
        assertThat(read(stored("U1"))).isEqualTo("900101-1234567");
        assertThat(read(stored("U2"))).isEqualTo("750101-1234567");
        assertThat(read(stored("U3"))).isEqualTo("800101-2234567");
        assertThat(service.run(false).targets()).isZero();
    }

    @Test
    @DisplayName("🚨 풀 수 없는 값을 만나면 멈추고 그 행을 덮어쓰지 않는다 — 로그·예외에 값이 없다")
    void stopsOnUndecipherableValueWithoutOverwriting() {
        RrnoKeyring.configure("new", Map.of("new", KEY_NEW));
        insert("U1", "corrupted-value");

        assertThatThrownBy(() -> service.run(true)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("esntl_id=U1").hasMessageNotContaining("corrupted-value");
        assertThat(stored("U1")).isEqualTo("corrupted-value");
    }
}
