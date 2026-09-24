package nuri.api.config;

import java.util.List;
import java.util.Properties;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.memoreport.MemoReportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.env.Environment;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 테스트 컨텍스트가 운영과 같은 JSON 변환기를 쓰는가(ADR-0024 1단계).
 *
 * <p>api-server 의 테스트 {@code application.yml} 은 main 의 같은 이름 파일을 가린다. Boot 4 는 매퍼 선택이 없으면
 * Jackson 3 변환기를 쓰므로, 선택이 테스트에만 빠지면 테스트는 Jackson 3·운영은 Jackson 2 로 서로 다른 변환기를
 * 검증한다(2026-09-24 실측 — 운영 경로에서는 통하는 본문이 테스트에서만 500 이었다). 두 파일의 선택을 대조하고,
 * 실제 MVC 변환기 목록과 두 매퍼에서 해석이 갈리던 요청 본문으로 확인한다. 2단계(Jackson 3)에서 기대값을 바꾼다.
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
@DisplayName("JSON 변환기 — 테스트 컨텍스트가 운영과 같은 매퍼를 쓴다")
class JsonConverterParityIntegrationTest {

    private static final List<String> MAPPER_KEYS = List.of(
            "spring.http.converters.preferred-json-mapper",
            "spring.websocket.messaging.preferred-json-mapper");

    @Autowired
    private Environment environment;

    @Autowired
    private RequestMappingHandlerAdapter handlerAdapter;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MemoReportService memoReportService;

    @Test
    @DisplayName("매퍼 선택이 main application.yml 과 같다")
    void mapperSelectionMatchesProductionConfiguration() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yml"));
        Properties production = yaml.getObject();

        assertThat(production).isNotNull();
        for (String key : MAPPER_KEYS) {
            assertThat(production.getProperty(key)).as("main application.yml " + key).isEqualTo("jackson2");
            assertThat(environment.getProperty(key)).as("테스트 컨텍스트 " + key).isEqualTo(production.getProperty(key));
        }
    }

    @Test
    @DisplayName("MVC JSON 변환기는 Jackson 2 호환 변환기 하나다")
    void mvcUsesJackson2JsonConverter() {
        List<String> converters = handlerAdapter.getMessageConverters().stream()
                .map(HttpMessageConverter::getClass)
                .map(Class::getName)
                .toList();

        assertThat(converters).contains("org.springframework.http.converter.json.MappingJackson2HttpMessageConverter");
        assertThat(converters).doesNotContain("org.springframework.http.converter.json.JacksonJsonHttpMessageConverter");
    }

    @Test
    @DisplayName("지시사항의 문자열·객체 본문이 서비스에 닿고 공백은 400 이다")
    void memoInstructionBodiesAreReadByProductionConverter() throws Exception {
        mockMvc.perform(patch("/api/v1/memo-reports/7/instr-cn").contentType(MediaType.APPLICATION_JSON)
                .content("\"문자열 지시\"")).andExpect(status().isOk());
        verify(memoReportService).updateDrctMatter(7L, "문자열 지시");

        mockMvc.perform(patch("/api/v1/memo-reports/8/instr-cn").contentType(MediaType.APPLICATION_JSON)
                .content("{\"drctnMttr\":\"객체 지시\"}")).andExpect(status().isOk());
        verify(memoReportService).updateDrctMatter(8L, "객체 지시");

        mockMvc.perform(patch("/api/v1/memo-reports/9/instr-cn").contentType(MediaType.APPLICATION_JSON)
                .content("{\"drctnMttr\":\"   \"}")).andExpect(status().isBadRequest());
    }
}
