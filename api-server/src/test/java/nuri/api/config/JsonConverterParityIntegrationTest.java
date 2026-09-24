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
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * JSON 변환기가 운영과 같고, Jackson 3 로 옮긴 뒤에도 wire 규칙이 Boot 3.5(Jackson 2) 때와 같은가(ADR-0024).
 *
 * <p>api-server 의 테스트 {@code application.yml} 은 main 의 같은 이름 파일을 가린다. 운영 설정의 매퍼 선택이
 * 테스트에만 빠지면 테스트와 운영이 서로 다른 규칙을 검증한다(1단계 실측 — 운영 경로에서 통하는 본문이 테스트에서만
 * 500 이었다). 2단계에서는 Jackson 3 의 바뀐 기본값(날짜 타임스탬프·primitive 의 null·뒤따르는 토큰·속성 정렬·
 * 파라미터 이름)이 응답과 요청 해석을 조용히 바꿀 수 있으므로, Boot 가 만든 실제 매퍼의 값을 고정한다.
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
@DisplayName("JSON 변환기 — 운영과 같은 매퍼·Boot 3.5 와 같은 wire 규칙")
class JsonConverterParityIntegrationTest {

    private static final List<String> MAPPER_KEYS = List.of(
            "spring.jackson.use-jackson2-defaults",
            "spring.jackson.mapper.detect-parameter-names");

    @Autowired
    private Environment environment;

    @Autowired
    private RequestMappingHandlerAdapter handlerAdapter;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MemoReportService memoReportService;

    @Test
    @DisplayName("매퍼 설정이 main application.yml 과 같다")
    void mapperSettingsMatchProductionConfiguration() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yml"));
        Properties production = yaml.getObject();

        assertThat(production).isNotNull();
        for (String key : MAPPER_KEYS) {
            assertThat(production.getProperty(key)).as("main application.yml " + key).isEqualTo("true");
            assertThat(environment.getProperty(key)).as("테스트 컨텍스트 " + key).isEqualTo(production.getProperty(key));
        }
    }

    @Test
    @DisplayName("MVC JSON 변환기는 Jackson 3 변환기 하나다")
    void mvcUsesJackson3JsonConverter() {
        List<String> converters = handlerAdapter.getMessageConverters().stream()
                .map(HttpMessageConverter::getClass)
                .map(Class::getName)
                .toList();

        assertThat(converters).contains("org.springframework.http.converter.json.JacksonJsonHttpMessageConverter");
        assertThat(converters).doesNotContain("org.springframework.http.converter.json.MappingJackson2HttpMessageConverter");
    }

    @Test
    @DisplayName("Boot 매퍼의 wire 규칙이 Boot 3.5(Jackson 2) 때와 같다")
    void bootMapperKeepsJackson2WireRules() {
        assertThat(jsonMapper.isEnabled(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)).as("날짜는 ISO 문자열").isFalse();
        assertThat(jsonMapper.isEnabled(DateTimeFeature.WRITE_DURATIONS_AS_TIMESTAMPS)).as("기간은 ISO 문자열").isFalse();
        assertThat(jsonMapper.isEnabled(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)).as("속성은 선언 순서").isFalse();
        assertThat(jsonMapper.isEnabled(MapperFeature.DETECT_PARAMETER_NAMES)).as("생성자 파라미터 이름 바인딩").isTrue();
        assertThat(jsonMapper.isEnabled(MapperFeature.DEFAULT_VIEW_INCLUSION)).as("뷰 미지정 필드 제외").isFalse();
        assertThat(jsonMapper.isEnabled(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)).as("primitive 의 null 허용").isFalse();
        assertThat(jsonMapper.isEnabled(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)).as("뒤따르는 토큰 허용").isFalse();
        assertThat(jsonMapper.isEnabled(SerializationFeature.FAIL_ON_EMPTY_BEANS)).as("빈 객체 직렬화 허용").isFalse();
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
