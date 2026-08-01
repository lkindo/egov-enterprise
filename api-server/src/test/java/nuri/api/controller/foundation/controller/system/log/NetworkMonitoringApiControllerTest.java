package nuri.api.controller.foundation.controller.system.log;

import nuri.business.test.BaseControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [W0-06] 이 테스트는 종전에 '거짓 성공'을 동결하고 있었다 —
 * 하드코딩된 노드 6건의 내용(sysNm/svcSttus/total=6)을 단언해, 계측 소스가 없다는 사실을
 * 오히려 회귀로부터 보호했다. 방향을 반전해, 저장 경로 없는 쓰기가 200 이 아니라 501 임을 고정한다.
 */
public class NetworkMonitoringApiControllerTest extends BaseControllerTest {

    private static final String BASE = "/api/v1/admin/system/ntwrksvc-monitoring";

    @Override
    protected Object getController() {
        return new NetworkMonitoringApiController();
    }

    @Test
    @DisplayName("GET - 계측 소스가 없으므로 빈 목록을 반환한다 (가짜 노드를 내리지 않는다)")
    public void getStatus_returnsEmptyList_insteadOfFabricatedNodes() throws Exception {
        mockMvc.perform(get(BASE)
                .param("pageIndex", "1")
                .param("pageUnit", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list").isEmpty())
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    @DisplayName("POST - 저장 경로가 없으므로 501 (성공으로 위장하지 않는다)")
    public void createNetwork_returns501() throws Exception {
        mockMvc.perform(post(BASE)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ntwrkId\":\"N1\",\"manageIem\":\"x\"}"))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(501));
    }

    @Test
    @DisplayName("PUT - 저장 경로가 없으므로 501")
    public void updateNetwork_returns501() throws Exception {
        mockMvc.perform(put(BASE + "/N1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ntwrkId\":\"N1\",\"manageIem\":\"x\"}"))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("DELETE - 저장 경로가 없으므로 501")
    public void deleteNetwork_returns501() throws Exception {
        mockMvc.perform(delete(BASE + "/N1"))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.success").value(false));
    }
}
