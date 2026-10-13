package nuri.migration.protect;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 보호 컬럼 암호화의 실행 경계(DEC-OPS-308): 키 부재·선언 위반은 실행 전에, 평문·되읽기 실패는 그 행을 쓰기 전에
 * 멈춘다. 오류 문구에는 키·값이 없고 테이블·컬럼 이름만 있다.
 */
@DisplayName("보호 컬럼 암호화 실행 경계")
class ColumnProtectorTest {

    private static final String KEY = "migration-protector-key-7f3a";
    private static final String RRNO = "800101-1234567";
    private static final ColumnProtectionPlan.ProtectedColumn USER_ENRRNO = new ColumnProtectionPlan.ProtectedColumn(
            "tb_user_info", "user_enrrno", ProtectedTargetColumns.find("tb_user_info", "user_enrrno").orElseThrow());

    @Test
    @DisplayName("주입된 키로 온라인 앱과 같은 암호문을 만들고, 빈 값은 NULL, 보호하지 않는 컬럼은 그대로 둔다")
    void encryptsDeclaredColumnsWithTheInjectedKey() {
        ColumnProtector protector = ColumnProtector.forRun(rrnoSpec(), environment(KEY));

        Object written = protector.protect("tb_user_info", "user_enrrno", RRNO);

        assertThat(written).isEqualTo(new EgovAriaColumnCipher(KEY).encrypt(RRNO));
        assertThat(new EgovAriaColumnCipher(KEY).decrypt((String) written)).isEqualTo(RRNO);
        assertThat(protector.protect("PUBLIC.TB_USER_INFO", "USER_ENRRNO", RRNO)).isEqualTo(written);
        assertThat(protector.protect("tb_user_info", "user_enrrno", "  ")).isNull();
        assertThat(protector.protect("tb_user_info", "user_enrrno", null)).isNull();
        assertThat(protector.protect("tb_user_info", "user_nm", RRNO)).isEqualTo(RRNO);
        assertThat(protector.protect("tb_user_info", "user_enrrno", 8001011234567L))
                .isEqualTo(new EgovAriaColumnCipher(KEY).encrypt("8001011234567"));
    }

    @Test
    @DisplayName("보호 컬럼이 없으면 키를 묻지 않는다")
    void runsWithoutAKeyWhenNothingIsProtected() {
        MappingSpec plain = spec(new ColumnMapping("NM", "user_nm", null, null, null, null, null));
        Function<String, String> noEnvironment = name -> {
            throw new AssertionError("키를 묻지 않아야 한다: " + name);
        };

        ColumnProtector protector = ColumnProtector.forRun(plain, noEnvironment);

        assertThat(protector).isSameAs(ColumnProtector.none());
        assertThat(protector.protect("tb_user_info", "user_enrrno", RRNO)).isEqualTo(RRNO);
    }

    @Test
    @DisplayName("키가 없거나 비면 행을 읽기 전에 멈추고, 환경 변수 이름과 컬럼만 밝힌다")
    void missingKeyFailsClosed() {
        for (String missing : new String[] {null, "", "   "}) {
            assertThatThrownBy(() -> ColumnProtector.forRun(rrnoSpec(), environment(missing)))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("보호 컬럼 암호화 키가 없습니다 — 환경 변수 MIGRATION_ALGORITHM_KEY 에 온라인 앱"
                            + " ALGORITHM_KEY 와 같은 값을 주입하세요: tb_user_info.user_enrrno");
        }
    }

    @Test
    @DisplayName("선언 위반은 키를 묻기 전에 멈추고 위반 문구를 모두 담는다")
    void declarationViolationsFailBeforeTheKeyIsRead() {
        MappingSpec undeclared = spec(new ColumnMapping("J", "user_enrrno", null, null, null, null, null));

        assertThatThrownBy(() -> ColumnProtector.forRun(undeclared, environment(KEY)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("보호 컬럼 선언 오류: tb_user_info.user_enrrno: 온라인 앱이 암호화해 저장하는 컬럼입니다"
                        + " — encrypt: aria-egov-v1 를 선언해야 평문으로 쓰지 않습니다");
    }

    @Test
    @DisplayName("쓰려는 값이 평문 형태면 그 값을 쓰지 않는다 — 문구에는 값이 없다")
    void plaintextShapedOutputIsRejected() {
        ColumnProtector broken = protectorWith(new FakeCipher(plaintext -> plaintext, ciphertext -> ciphertext));

        assertThatThrownBy(() -> broken.protect("tb_user_info", "user_enrrno", RRNO))
                .isInstanceOf(ColumnProtector.ProtectedColumnException.class)
                .hasMessage("PROTECTED_COLUMN tb_user_info.user_enrrno: 평문 형태의 값은 암호화 컬럼에 쓸 수 없습니다");
        assertThatThrownBy(() -> broken.protect("tb_user_info", "user_enrrno", "8001011234567"))
                .hasMessage("PROTECTED_COLUMN tb_user_info.user_enrrno: 평문 형태의 값은 암호화 컬럼에 쓸 수 없습니다");
    }

    @Test
    @DisplayName("암호문 형식(표준 Base64, 16바이트 배수)이 아닌 값도 쓰지 않는다")
    void nonCiphertextOutputIsRejected() {
        String shape = "PROTECTED_COLUMN tb_user_info.user_enrrno: 암호문 형식이 아닌 값은 암호화 컬럼에 쓸 수 없습니다";
        for (String output : new String[] {"not base64!", "QUJD", "", "AAAAAAAAAAAAAAAAAAAAAA==\n",
                "AAAAAAAAAAAAAAAAAAAAAB==", "AAAAAAAAAAAAAAAAAAAAAAA="}) {
            ColumnProtector broken = protectorWith(new FakeCipher(plaintext -> output, ciphertext -> RRNO));
            assertThatThrownBy(() -> broken.protect("tb_user_info", "user_enrrno", RRNO))
                    .as(output)
                    .isInstanceOf(ColumnProtector.ProtectedColumnException.class)
                    .hasMessage(shape);
        }
    }

    @Test
    @DisplayName("온라인 앱이 되읽지 못하는 값은 쓰지 않는다")
    void valuesTheOnlineAppCannotReadBackAreRejected() {
        String unreadable = "PROTECTED_COLUMN tb_user_info.user_enrrno: 온라인 앱이 되읽을 수 없는 값입니다";
        // 16바이트 배수이고 마지막 바이트가 1 이면 온라인 복호화가 1바이트를 걷어 낸다.
        String trailingOne = "ABCDEFGHIJKLMNO\u0001";
        ColumnProtector real = protectorWith(new EgovAriaColumnCipher(KEY));
        assertThatThrownBy(() -> real.protect("tb_user_info", "user_enrrno", trailingOne))
                .isInstanceOf(ColumnProtector.ProtectedColumnException.class).hasMessage(unreadable);

        String validShape = new EgovAriaColumnCipher(KEY).encrypt(RRNO);
        ColumnProtector failingDecrypt = protectorWith(new FakeCipher(plaintext -> validShape, ciphertext -> {
            throw new IllegalArgumentException("decrypt failure " + ciphertext);
        }));
        assertThatThrownBy(() -> failingDecrypt.protect("tb_user_info", "user_enrrno", RRNO))
                .isInstanceOf(ColumnProtector.ProtectedColumnException.class).hasMessage(unreadable);

        ColumnProtector binary = protectorWith(new EgovAriaColumnCipher(KEY));
        assertThatThrownBy(() -> binary.protect("tb_user_info", "user_enrrno", new byte[] {1, 2}))
                .isInstanceOf(ColumnProtector.ProtectedColumnException.class)
                .hasMessage("PROTECTED_COLUMN tb_user_info.user_enrrno: 이진 값은 암호화할 수 없습니다");
    }

    @Test
    @DisplayName("어떤 오류 문구에도 키와 값이 담기지 않는다")
    void messagesNeverCarryTheKeyOrTheValue() {
        ColumnProtector real = ColumnProtector.forRun(rrnoSpec(), environment(KEY));
        Throwable unreadable = org.assertj.core.api.Assertions.catchThrowable(
                () -> real.protect("tb_user_info", "user_enrrno", "ABCDEFGHIJKLMNO\u0001"));
        Throwable plaintext = org.assertj.core.api.Assertions.catchThrowable(
                () -> protectorWith(new FakeCipher(p -> p, c -> c)).protect("tb_user_info", "user_enrrno", RRNO));

        for (Throwable failure : new Throwable[] {unreadable, plaintext}) {
            assertThat(failure.getMessage()).doesNotContain(KEY, RRNO, "ABCDEFGHIJKLMNO");
        }
    }

    private static ColumnProtector protectorWith(ColumnCipher cipher) {
        return new ColumnProtector(Map.of(ColumnProtectionPlan.key("tb_user_info", "user_enrrno"), USER_ENRRNO), cipher);
    }

    private static MappingSpec rrnoSpec() {
        return spec(new ColumnMapping("JUMIN", "user_enrrno", "trim", null, null, null, null, "aria-egov-v1"));
    }

    private static MappingSpec spec(ColumnMapping column) {
        return new MappingSpec(null, null,
                List.of(new TableMapping("LEGACY_USER", "tb_user_info", null, List.of(column), null)), Map.of());
    }

    private static Function<String, String> environment(String key) {
        return name -> ColumnProtector.KEY_ENVIRONMENT.equals(name) ? key : null;
    }

    private record FakeCipher(Function<String, String> encrypt, Function<String, String> decrypt)
            implements ColumnCipher {

        @Override
        public String encrypt(String plaintext) {
            return encrypt.apply(plaintext);
        }

        @Override
        public String decrypt(String ciphertext) {
            return decrypt.apply(ciphertext);
        }
    }
}
