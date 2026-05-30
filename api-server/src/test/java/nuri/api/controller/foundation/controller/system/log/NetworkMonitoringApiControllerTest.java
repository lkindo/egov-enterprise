package nuri.api.controller.foundation.controller.system.log;

import nuri.business.test.BaseControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class NetworkMonitoringApiControllerTest extends BaseControllerTest {

    @Override
    protected Object getController() {
        return new NetworkMonitoringApiController();
    }

    @Test
    public void getStatus_ShouldReturnMockTopologyStatusList() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/ntwrksvc-monitoring")
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].sysNm").value("Cloud Front / LB"))
                .andExpect(jsonPath("$.data.list[1].sysNm").value("API Server Node A"))
                .andExpect(jsonPath("$.data.list[2].svcSttus").value("WARNING"))
                .andExpect(jsonPath("$.data.total").value(6));
    }
}
