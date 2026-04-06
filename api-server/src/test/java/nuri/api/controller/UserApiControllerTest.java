package nuri.api.controller;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.domain.user.entity.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class UserApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserApiController userController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);

        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
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
