package egovframework.com.utl.sim.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("EgovFileScrty 테스트")
class EgovFileScrtyTest {

    @Test
    @DisplayName("ID를 포함한 비밀번호 암호화 테스트")
    void testEncryptPasswordWithId() throws Exception {
        String password = "password123";
        String id = "user01";
        String encrypted = EgovFileScrty.encryptPassword(password, id);

        assertThat(encrypted).isNotBlank();
        assertThat(encrypted).isNotEqualTo(password);
    }

    // [2026-10-07] 레거시 해시 계정의 로그인 호환을 지키는 알려진 값(KAT).
    //   기대값은 Base64(SHA-256(UTF-8(id) || UTF-8(password))) 를 별도 도구(openssl)로 계산했다.
    //   문자셋·update 순서·인코딩 중 하나라도 바뀌면 기존 저장 해시와 맞지 않아 로그인이 깨진다.
    @Test
    @DisplayName("레거시 해시 형식이 알려진 값과 같다(ID 를 앞에 붙인 SHA-256, Base64)")
    void encryptPasswordMatchesKnownLegacyVectors() throws Exception {
        assertThat(EgovFileScrty.encryptPassword("password123", "user01"))
                .isEqualTo("VmFrUYSfHFIvCgTH7gUggPqdLqj25vSSMhdiC/vi/RE=");
        assertThat(EgovFileScrty.encryptPassword("비밀번호1!", "user01"))
                .isEqualTo("2QfZcLOXMvYAFSvQoSPPzCGLcaVkONFILXHQgFjutUU=");
    }

    @Test
    @DisplayName("null 입력 처리 테스트")
    void testNullInputs() throws Exception {
        assertThat(EgovFileScrty.encryptPassword(null, "id")).isEqualTo("");
    }
}
