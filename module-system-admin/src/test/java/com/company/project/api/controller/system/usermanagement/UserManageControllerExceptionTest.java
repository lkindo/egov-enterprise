package com.company.project.api.controller.system.usermanagement;

import com.company.project.core.exception.GlobalExceptionHandler;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.usermanagement.UserManageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserManageController.class)
@ContextConfiguration(classes = {
        UserManageController.class,
        UserManageControllerExceptionTest.TestConfig.class
})
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class UserManageControllerExceptionTest {

    @org.springframework.boot.SpringBootConfiguration
    @org.springframework.boot.autoconfigure.EnableAutoConfiguration(exclude = {
            org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
            org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
            org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class,
            org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration.class
    })
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserManageService userManageService;

    @Test
    @DisplayName("BusinessException 발생 시 GlobalExceptionHandler가 ApiResponse 규격으로 응답하는지 확인")
    void getUser_businessException_returnsErrorResponse() throws Exception {
        // given
        doThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                .when(userManageService).selectUser("non_existent_user");

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/users/non_existent_user"))
                .andDo(print())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("U001"))
                .andExpect(jsonPath("$.message").value("User Not Found"));
    }

    @Test
    @DisplayName("IllegalArgumentException 발생 시 400 Bad Request 응답 확인")
    void getUser_illegalArgument_returnsBadRequest() throws Exception {
        // given
        doThrow(new IllegalArgumentException("잘못된 요청 파라미터입니다."))
                .when(userManageService).selectUser("bad_id");

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/users/bad_id"))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
