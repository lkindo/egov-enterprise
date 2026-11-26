package nuri.api.controller.business.cms;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.cms.CmsHomeService;
import nuri.business.service.cms.dto.CmsHomeDto;
import nuri.business.service.cms.dto.CmsHomeUpdateRequest;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.core.annotation.SensitiveOperation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.lang.reflect.Method;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CmsHomeAdminApiController.class)
@DisplayName("CmsHomeAdminApiController 입력 계약")
class CmsHomeAdminApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private CmsHomeService cmsHomeService;

    @Test
    @WithMockCustomUser
    @DisplayName("업무 홈 소개 지정 상태를 조회한다")
    void returnsCurrentHomeIntro() throws Exception {
        when(cmsHomeService.getHome()).thenReturn(new CmsHomeDto(11L, "notice-home", "홈 안내", 3));

        mockMvc.perform(get("/api/v1/admin/system/content-home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.contsSn").value(11))
                .andExpect(jsonPath("$.data.contsPathNm").value("notice-home"))
                .andExpect(jsonPath("$.data.version").value(3));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("업무 홈 소개 지정은 버전이 없으면 서비스 전에 400 이고, 있으면 서비스에 위임한다")
    void updateHomeRequiresVersionAndDelegates() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/content-home")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contsSn\":11}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(cmsHomeService);

        when(cmsHomeService.updateHome(argThat((CmsHomeUpdateRequest req) ->
                Long.valueOf(11L).equals(req.getContsSn()) && Integer.valueOf(2).equals(req.getVersion()))))
                .thenReturn(new CmsHomeDto(11L, "notice-home", "홈 안내", 3));

        mockMvc.perform(put("/api/v1/admin/system/content-home")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contsSn\":11,\"version\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.contsSn").value(11))
                .andExpect(jsonPath("$.data.version").value(3));
        verify(cmsHomeService).updateHome(argThat((CmsHomeUpdateRequest req) ->
                Long.valueOf(11L).equals(req.getContsSn()) && Integer.valueOf(2).equals(req.getVersion())));
    }

    @Test
    @DisplayName("업무 홈 소개 지정 변경은 민감 작업 감사 표지가 있고, 조회에는 없다")
    void updateHomeCarriesSensitiveOperationAnnotation() {
        Method update = Arrays.stream(CmsHomeAdminApiController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals("updateHome"))
                .findFirst().orElseThrow();
        SensitiveOperation marker = update.getAnnotation(SensitiveOperation.class);
        assertThat(marker).isNotNull();
        assertThat(marker.value()).isEqualTo("업무 홈 소개 지정");

        Method get = Arrays.stream(CmsHomeAdminApiController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals("getHome"))
                .findFirst().orElseThrow();
        assertThat(get.getAnnotation(SensitiveOperation.class)).isNull();
    }
}
