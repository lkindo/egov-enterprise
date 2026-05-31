package nuri.api.controller.foundation.controller.system;

import nuri.business.test.BaseControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class DebugControllerTest extends BaseControllerTest {

    @Override
    protected Object getController() {
        return new DebugController();
    }

    @Test
    public void triggerError_ShouldReturnForced500Error() throws Exception {
        mockMvc.perform(get("/api/v1/public/debug/error")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("서버 내부 오류가 발생했습니다. 지속될 경우 관리자에게 문의해 주세요."));
    }
}
