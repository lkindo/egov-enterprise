package nuri.foundation.api.controller.system.template;

import nuri.foundation.domain.template.Template;
import nuri.foundation.service.template.TmplatInfoService;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TemplateApiController.class)
@DisplayName("TemplateApiController 단위 테스트")
class TemplateApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TmplatInfoService tmplatInfoService;

    @MockitoBean
    private JPAQueryFactory jpaQueryFactory;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("템플릿 목록 조회 테스트")
    void selectTmplatInfoListTest() throws Exception {
        given(tmplatInfoService.selectTmplatInfoList()).willReturn(List.of(Template.builder().build()));

        mockMvc.perform(get("/api/v1/admin/system/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("템플릿 등록 테스트")
    void insertTmplatInfoTest() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/templates")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tmplatId\":\"T1\", \"tmplatNm\":\"Test Template\"}"))
                .andExpect(status().isOk());
    }
}
