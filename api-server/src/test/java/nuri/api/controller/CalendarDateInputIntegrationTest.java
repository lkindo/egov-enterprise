package nuri.api.controller;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.operation.EventInfoService;
import nuri.business.service.survey.OnlinePollService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
class CalendarDateInputIntegrationTest {
    @Autowired MockMvc mvc;
    @MockitoBean EventInfoService events;
    @MockitoBean OnlinePollService polls;

    @Test
    void validEventAndPollReachTheirServices() throws Exception {
        mvc.perform(post("/api/v1/admin/operation/events").contentType(MediaType.APPLICATION_JSON)
                .content("{\"evntNm\":\"행사\",\"evntBgngYmd\":\"20240229\",\"evntEndYmd\":\"20240301\"}"))
                .andExpect(status().isOk());
        verify(events).createEvent(anyString(), any());
        mvc.perform(post("/api/v1/polls").contentType(MediaType.APPLICATION_JSON)
                .content("{\"pollNm\":\"설문\",\"pollBgngYmd\":\"20240229\",\"pollEndYmd\":\"20240301\"}"))
                .andExpect(status().isOk());
        verify(polls).insertPoll(any());
    }

    @Test
    void impossibleDateIsAFieldErrorBeforeCreateService() throws Exception {
        mvc.perform(post("/api/v1/admin/operation/events").contentType(MediaType.APPLICATION_JSON)
                .content("{\"evntNm\":\"행사\",\"evntBgngYmd\":\"20260229\",\"evntEndYmd\":\"20260301\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("evntBgngYmd")));
        verify(events, never()).createEvent(anyString(), any());
    }

    @Test
    void reversedPeriodIsAnEndFieldErrorBeforeUpdateService() throws Exception {
        mvc.perform(put("/api/v1/polls/1").contentType(MediaType.APPLICATION_JSON)
                .content("{\"pollNm\":\"설문\",\"pollBgngYmd\":\"20260910\",\"pollEndYmd\":\"20260909\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("pollEndYmd")));
        verify(polls, never()).updatePoll(any());
    }
}
