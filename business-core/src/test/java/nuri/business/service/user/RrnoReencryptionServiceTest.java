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

    /** "<접두>:<원문>" 을 암호문으로 돌려주는 ARIA 대역 — 다른 접두의 값을 풀면 예외 대신 엉뚱한 바이트를 준다(실제 ARIA 와 같은 성질). */
    private static EgovCryptoService aria(String prefix, String garbageOnWrongKey) throws Exception {
        EgovCryptoService aria = Mockito.mock(EgovCryptoService.class);
        when(aria.encrypt(any(byte[].class), any(String.class))).thenAnswer(inv -> (prefix + ":" + new String(
                (byte[]) inv.getArgument(0), StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8));
        when(aria.decrypt(any(byte[].class), any(String.class))).thenAnswer(inv -> {
            String raw = new String((byte[]) inv.getArgument(0), StandardCharsets.UTF_8);
            if (raw.startsWith(prefix + ":")) return raw.substring(prefix.length() + 1).getBytes(StandardCharsets.UTF_8);
            if (garbageOnWrongKey != null) return garbageOnWrongKey.getBytes(StandardCharsets.UTF_8);
            throw new IllegalArgumentException("not this key");
        });
        return aria;
    }

    private static String ariaCiphertext(String prefix, String plaintext) {
        return Base64.getEncoder().encodeToString((prefix + ":" + plaintext).getBytes(StandardCharsets.UTF_8));
    }

    @BeforeEach
    void setUp() throws Exception {
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", aria("cur", null));
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
        ReflectionTestUtils.setField(CryptoUtil.class, "previousCryptoService", null);
        ReflectionTestUtils.setField(CryptoUtil.class, "previousAlgorithmKey", null);
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
    @DisplayName("점검은 ARIA·평문·이전 키 v2 를 세기만 하고, 빈 값·활성 키 v2 는 세지 않는다")
    void dryRunCountsOnlyNonActiveValues() {
        String ariaValue = ariaCiphertext("cur", "900101-1234567");
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
    @DisplayName("적용은 모든 대상을 활성 키 v2 로 다시 쓰고 값은 그대로 읽힌다 — 다시 돌리면 대상이 0 이다")
    void applyRewritesEveryTargetToActiveKeyAndIsIdempotent() {
        String ariaValue = ariaCiphertext("cur", "900101-1234567");
        RrnoKeyring.configure("old", Map.of("old", KEY_OLD));
        String oldEnvelope = RrnoKeyring.encrypt("800101-2234567");
        RrnoKeyring.configure("new", Map.of("old", KEY_OLD, "new", KEY_NEW));
        insert("U1", ariaValue);
        insert("U2", "750101-1234567");
        insert("U3", oldEnvelope);
        // 한 쪽보다 많은 행에서도 키셋 페이징이 끝까지 간다
        for (int i = 0; i < RrnoReencryptionService.CHUNK + 5; i++) {
            insert(String.format("Z%05d", i), String.format("750101-12%05d", i));
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
    @DisplayName("🚨 풀 수 없는 값이 하나라도 있으면 판독 단계에서 멈추고 아무 행도 쓰지 않는다 — 메시지에 값이 없다")
    void stopsBeforeAnyWriteWhenAValueCannotBeResolved() {
        RrnoKeyring.configure("new", Map.of("new", KEY_NEW));
        String good = ariaCiphertext("cur", "900101-1234567");
        insert("A1", good);
        insert("U1", "corrupted-value");

        for (boolean apply : new boolean[] { false, true }) {
            assertThatThrownBy(() -> service.run(apply))
                    .isInstanceOf(RrnoReencryptionService.ReencryptionStopped.class)
                    .hasMessageContaining("U1").hasMessageContaining("1 stored value")
                    .hasMessageNotContaining("corrupted-value").hasMessageNotContaining("900101");
        }
        assertThat(stored("A1")).isEqualTo(good);
        assertThat(stored("U1")).isEqualTo("corrupted-value");
    }

    @Test
    @DisplayName("🚨 이전 v2 키를 키링에서 빠뜨리면 점검이 먼저 멈춘다 — 앞 행을 쓰고 나서야 실패하지 않는다")
    void missingPreviousEnvelopeKeyStopsAtDryRun() {
        RrnoKeyring.configure("old", Map.of("old", KEY_OLD));
        String oldEnvelope = RrnoKeyring.encrypt("800101-2234567");
        RrnoKeyring.configure("new", Map.of("new", KEY_NEW)); // old 키를 빠뜨렸다
        insert("A1", ariaCiphertext("cur", "900101-1234567"));
        insert("U3", oldEnvelope);

        assertThatThrownBy(() -> service.run(false)).isInstanceOf(RrnoReencryptionService.ReencryptionStopped.class)
                .hasMessageContaining("U3").hasMessageContaining("RRNO_KEYS_JSON");
        assertThatThrownBy(() -> service.run(true)).isInstanceOf(RrnoReencryptionService.ReencryptionStopped.class);
        assertThat(stored("A1")).isEqualTo(ariaCiphertext("cur", "900101-1234567"));
    }

    @Test
    @DisplayName("🚨 ARIA 키 교체 중: 현재 키가 예외 없이 엉뚱한 값을 내도 이전 키의 주민번호 꼴 결과를 쓴다 — 둘 다 꼴이 맞으면 멈춘다")
    void ariaKeyRotationResolvesByFormatAndStopsWhenAmbiguous() throws Exception {
        RrnoKeyring.configure("new", Map.of("new", KEY_NEW));
        // 현재 키: 이전 키 암호문을 풀면 예외 없이 형식 밖의 바이트를 준다
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", aria("cur", "\u0001garbage\u0002"));
        ReflectionTestUtils.setField(CryptoUtil.class, "previousCryptoService", aria("old", null));
        ReflectionTestUtils.setField(CryptoUtil.class, "previousAlgorithmKey", "previous");
        insert("U1", ariaCiphertext("old", "800101-2234567"));
        insert("U2", ariaCiphertext("cur", "900101-1234567"));

        var result = service.run(true);
        assertThat(result.rewritten()).isEqualTo(2);
        assertThat(read(stored("U1"))).isEqualTo("800101-2234567");
        assertThat(read(stored("U2"))).isEqualTo("900101-1234567");

        // 현재 키가 다른 키의 암호문을 '주민번호 꼴'로 잘못 푸는 경우 — 어느 키의 값인지 알 수 없으므로 쓰지 않는다
        ReflectionTestUtils.setField(CryptoUtil.class, "cryptoService", aria("cur", "111111-1111111"));
        String ambiguous = ariaCiphertext("old", "800101-2234567");
        insert("U9", ambiguous);
        assertThatThrownBy(() -> service.run(true)).isInstanceOf(RrnoReencryptionService.ReencryptionStopped.class)
                .hasMessageContaining("U9");
        assertThat(stored("U9")).isEqualTo(ambiguous);
    }
}
