package nuri.api.controller.business.operation;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.operation.ExternalHrService;
import nuri.business.service.operation.dto.ExternalHrDto;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.core.annotation.PrivacyAccess;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 외부인사 API 검증 — 컨트롤러 테스트가 <b>하나도 없던</b> 엔드포인트다.
 *
 * <p>이 응답에는 성명·생년월일·전화번호·이메일이 실린다. 즉 <b>타인의 개인정보</b>이며,
 * 그래서 조회에 {@link PrivacyAccess} 가 붙어 접근 증적이 {@code tb_privacy_log} 에 남는다.
 * 그 애노테이션이 사라지면 개인정보가 <b>증적 없이</b> 조회되므로 존재를 계약으로 고정한다.
 */
@WebMvcTest(ExternalHrApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ExternalHrApiController 테스트")
class ExternalHrApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private ExternalHrService externalHrService;

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("외부인사 목록을 페이지로 조회한다")
    void getAllExternalHr_returnsPage() throws Exception {
        ExternalHrDto dto = new ExternalHrDto();
        dto.setOtsdHrNm("홍길동");
        Page<ExternalHrDto> page = new PageImpl<>(List.of(dto));
        given(externalHrService.getExternalHrList(any(), any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/operation/external-hr").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].otsdHrNm").value("홍길동"));
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("성명 검색어를 서비스까지 전달한다")
    void getAllExternalHr_passesNameFilter() throws Exception {
        given(externalHrService.getExternalHrList(any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/admin/operation/external-hr")
                        .param("name", "홍길")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<String> captor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(externalHrService).getExternalHrList(captor.capture(), any(Pageable.class));
        assertThat(captor.getValue()).isEqualTo("홍길");
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("외부인사를 등록한다")
    void createExternalHr_succeeds() throws Exception {
        given(externalHrService.createExternalHr(any(ExternalHrDto.class))).willReturn(new ExternalHrDto());

        mockMvc.perform(post("/api/v1/admin/operation/external-hr")
                        .contentType(MediaType.APPLICATION_JSON)
                        // evntSn(@NotNull)·otsdHrId(@NotBlank)가 필수다 — 둘을 빼면 400 이다.
                        .content("{\"evntSn\":1,\"otsdHrId\":\"HR001\",\"otsdHrNm\":\"홍길동\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    /**
     * 필수 필드가 빠진 등록은 서비스에 도달하지 않고 400 이어야 한다. 서비스까지 흘러가면
     * 행사 번호 없는 외부인사 행이 만들어져 이후 조회에서 소속을 잃는다.
     */
    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("필수 필드가 없는 등록은 서비스에 도달하지 않는다")
    void createExternalHr_rejectsMissingRequiredFields() throws Exception {
        mockMvc.perform(post("/api/v1/admin/operation/external-hr")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"otsdHrNm\":\"홍길동\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(externalHrService, org.mockito.Mockito.never())
                .createExternalHr(any(ExternalHrDto.class));
    }

    /**
     * 개인정보 접근 증적은 이 애노테이션 <b>한 줄</b>에서 시작한다. 지우면 조회는 계속 되지만
     * {@code tb_privacy_log} 가 조용히 비어 가고, 빈 증적은 "접근이 없었다" 로 오독된다.
     *
     * <p>부착 지점 전수는 {@code PrivacyAccessCensusLinterTest} 가 양방향으로 동결한다.
     * 여기서는 이 엔드포인트가 그 대상임을 소비자 관점에서 한 번 더 못 박는다.
     */
    @Test
    @DisplayName("목록 조회는 개인정보 접근 증적 대상으로 선언돼 있다")
    void listIsDeclaredAsPrivacyAccess() throws NoSuchMethodException {
        Method handler = ExternalHrApiController.class.getMethod(
                "getAllExternalHr", String.class, Pageable.class);

        PrivacyAccess annotation = handler.getAnnotation(PrivacyAccess.class);
        assertThat(annotation)
                .as("외부인사 목록은 생년월일·전화번호·이메일을 싣는다 — 증적 없이 열려선 안 된다")
                .isNotNull();
        assertThat(annotation.value()).isNotBlank();
    }

    /**
     * 등록은 개인정보를 <b>조회</b>하지 않는다. 쓰기까지 증적으로 세면 "누가 남의 정보를 봤는가"
     * 라는 질문에 답해야 할 로그가 등록 이력으로 희석된다.
     */
    @Test
    @DisplayName("등록은 개인정보 조회 증적 대상이 아니다")
    void createIsNotPrivacyAccess() throws NoSuchMethodException {
        assertThat(ExternalHrApiController.class.getMethod("createExternalHr", ExternalHrDto.class)
                .isAnnotationPresent(PrivacyAccess.class))
                .isFalse();
    }
}
