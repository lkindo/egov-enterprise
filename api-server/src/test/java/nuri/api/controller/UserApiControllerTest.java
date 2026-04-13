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
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        userService = mock(UserService.class);
        return new UserApiController(userService);
    }

    @Test
    public void signup_ShouldFail_WhenInputIsInvalid() throws Exception {
        // Invalid request: empty userId, short password, empty userNm
        UserSignupRequest request = new UserSignupRequest(
                "", "123", "", Role.USER, "hint", "123");

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void signup_ShouldSucceed_WhenInputIsValid() throws Exception {
        // Valid request
        UserSignupRequest request = new UserSignupRequest(
                "validUser", "ValidPass123!", "Valid Name", Role.USER, "hint", "ValidPass123!");

        UserResponse response = new UserResponse(
                "validUser", "Valid Name", Role.USER);

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
