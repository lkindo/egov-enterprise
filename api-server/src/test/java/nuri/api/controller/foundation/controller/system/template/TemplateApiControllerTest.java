package nuri.api.controller.foundation.controller.system.template;

import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.TmplatInfoService;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(TemplateApiController.class)
@DisplayName("TemplateApiController 단위 테스트")
class TemplateApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private TmplatInfoService tmplatInfoService;

    @MockitoBean
    private JPAQueryFactory jpaQueryFactory;

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("템플릿 목록 조회 테스트")
    void selectTmplatInfoListTest() throws Exception {
        given(tmplatInfoService.selectTmplatInfoList()).willReturn(List.of(TemplateDto.builder().build()));

        mockMvc.perform(get("/api/v1/admin/system/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("템플릿 등록 테스트")
    void insertTmplatInfoTest() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/templates")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tmpltId\":\"T1\", \"tmplatNm\":\"Test Template\"}"))
                .andExpect(status().isOk());
    }
}
