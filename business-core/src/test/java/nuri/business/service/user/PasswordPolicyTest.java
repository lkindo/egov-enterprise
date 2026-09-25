package nuri.business.service.user;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import nuri.business.service.user.dto.AdminPasswordChangeRequest;
import nuri.business.service.user.dto.PasswordChangeRequest;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.business.service.user.dto.UserValidationGroups;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 비밀번호 공용 규칙 — 등록·가입·본인 변경·관리자 초기화가 같은 입력에 같은 판정을 내린다(DIP S5).
 *
 * <p>종전에는 네 경로의 규칙이 서로 달라, 한 경로에서 막힌 비밀번호가 다른 경로로는 들어갔다.
 * 이 테스트는 같은 입력을 네 DTO 에 똑같이 흘려 판정이 갈리지 않는지 본다.
 */
@DisplayName("PasswordPolicy")
class PasswordPolicyTest {

    private static final int PATHS = 4;

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Abcdef1#",          // 종전 등록·가입 규칙이 거부하던 '#'
            "password123!",
            "Pa1~`^_{}|[]\\:;<>,.?/\"'",   // 공백을 뺀 ASCII 기호 전부 허용
            "Aa1!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})  // 64자
    @DisplayName("규칙을 지킨 비밀번호는 네 경로 모두 통과한다")
    void acceptedEverywhere(String password) {
        assertThat(rejectingPaths(password)).as("어느 경로도 거부하면 안 된다").isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "abcdefgh",          // 숫자·특수 없음 — 종전 본인 변경·관리자 초기화는 통과시켰다
            "abcdef12",          // 특수 없음
            "!!!!1111",          // 영문 없음
            "Abc1!",             // 8자 미만
            "Abcd 12!",          // 공백
            "비밀번호Ab1!",       // 비ASCII
            "Aa1!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}) // 65자
    @DisplayName("규칙을 어긴 비밀번호는 네 경로 모두 거부된다 — 경로마다 판정이 갈리지 않는다")
    void rejectedEverywhere(String password) {
        assertThat(rejectingPaths(password)).as("네 경로 모두 거부해야 한다").isEqualTo(PATHS);
    }

    private int rejectingPaths(String password) {
        int rejecting = 0;
        if (hasViolationOn(validator.validate(new AdminPasswordChangeRequest(password)), "newPassword")) {
            rejecting++;
        }
        if (hasViolationOn(validator.validate(PasswordChangeRequest.builder()
                .oldPassword("Current1!").newPassword(password).build()), "newPassword")) {
            rejecting++;
        }
        if (hasViolationOn(validator.validate(UserSignupRequest.builder()
                .userId("user01").pswd(password).userNm("사용자").build()), "pswd")) {
            rejecting++;
        }
        if (hasViolationOn(validator.validate(UserDto.builder()
                .userId("user01").userNm("사용자").pswd(password).build(), UserValidationGroups.OnCreate.class), "pswd")) {
            rejecting++;
        }
        return rejecting;
    }

    private static <T> boolean hasViolationOn(Set<ConstraintViolation<T>> violations, String field) {
        return violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals(field));
    }
}
