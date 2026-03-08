package com.company.project.integration;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = com.company.project.config.MinimalTestConfig.class, properties = {
                "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
@Transactional
@ActiveProfiles("test")
class CoreIntegrationTest {
        @Autowired private UserService userService;
        private UserSignupRequest signupRequest;
        @BeforeEach void setUp() {
                signupRequest = new UserSignupRequest("coreIntegrationUser", "password123!", "테스트사용자", com.company.project.domain.user.entity.Role.USER, "hint", "answer");
        }
        @Test void userSignupAndRetrieval_integrationTest() {
                userService.signup(signupRequest);
                List<UserDto> userList = userService.getUserList();
                assertThat(userList).isNotEmpty();
        }
        @Test void getUserById_integrationTest() {
                userService.signup(signupRequest);
                UserDto retrievedUser = userService.getUserById("coreIntegrationUser");
                assertThat(retrievedUser).isNotNull();
                assertThat(retrievedUser.getUserNm()).isEqualTo("테스트사용자");
        }
        @Test void multipleUsers_signupAndListRetrieval_integrationTest() {
                UserSignupRequest request1 = new UserSignupRequest("multiUser1", "password123!", "멀티사용자1", com.company.project.domain.user.entity.Role.USER, "hint", "answer");
                userService.signup(request1);
                List<UserDto> userList = userService.getUserList();
                assertThat(userList).extracting(UserDto::getUserId).contains("multiUser1");
        }
}
