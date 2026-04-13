package nuri.api.controller;

import nuri.foundation.test.BaseControllerTest;

import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.domain.user.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class UserApiControllerTest extends BaseControllerTest {
    private UserService userService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    @Override
    protected Object getController() {
        userService = mock(UserService.class);
        return new UserApiController(userService);
    }

    @Test
    public void signup_ShouldFail_WhenInputIsInvalid() throws Exception {
        // Invalid request: empty userId, short password, empty userNm
        UserSignupRequest request = UserSignupRequest.builder()
                .userId("")
                .password("123")
                .userNm("")
                .role("USER")
                .passwordHint("hint")
                .passwordCnsr("123")
                .build();

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void signup_ShouldSucceed_WhenInputIsValid() throws Exception {
        // Valid request
        UserSignupRequest request = UserSignupRequest.builder()
                .userId("validUser")
                .password("ValidPass123!")
                .userNm("Valid Name")
                .role("USER")
                .passwordHint("hint")
                .passwordCnsr("ValidPass123!")
                .build();

        UserResponse response = UserResponse.builder()
                .userId("validUser")
                .userNm("Valid Name")
                .role(Role.USER)
                .build();

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
