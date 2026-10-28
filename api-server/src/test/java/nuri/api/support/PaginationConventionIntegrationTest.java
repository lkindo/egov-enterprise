package nuri.api.support;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.annotation.WithMockCustomUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ADR-0036 의 페이징·생성 응답 규약을 <b>운영과 같은 Spring 컨텍스트</b>에서 HTTP 로 확인한다.
 *
 * <p>standalone MockMvc 는 Boot 설정·필터를 읽지 않아 리졸버가 운영과 다를 수 있다(테스트 application.yml 섀도잉과 같은 함정).
 * 그래서 여기서는 실제 리졸버(one-indexed)·{@link PaginationRequestFilter}·운영 보안 체인을 지난 응답만 본다.
 * 두 바인딩 방식을 하나씩 고른다 — {@code Pageable}(부서 업무 목록)과 {@code BaseSearchDto}(공통 분류코드 목록).
 *
 * <p>[예시는 core 엔드포인트] 규약은 core 의 리졸버·필터가 집행하므로 예시도 모든 생성물에 남는 core 목록으로 둔다
 * (가이드 §4.2, DEC-OPS-259 ④). 기능 소유 목록(스크랩·업무보고)을 예시로 쓰면 그 기능이 빠진 생성물에서 컨트롤러가 없는
 * 경로가 운영 체인에서 403 으로 막혀 규약과 무관하게 붉었다(T2, 2026-10-20~). 두 목록 모두 정렬이 고유 키라
 * (부서 업무 일련번호 역순·분류코드 순) 페이지 비중복과 별칭 페이지의 동일성이 결정적이다.
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
@DisplayName("ADR-0036 — 1 기반 페이지·잘못된 입력 400·생성 201 (운영 컨텍스트)")
class PaginationConventionIntegrationTest {

    /** 부서 업무 등록은 담당자(기본값 = 등록자)가 사용 중 계정이어야 한다 — 이 시험만의 주체를 둔다(트랜잭션 롤백). */
    private static final String DEPT_JOB_ACTOR = "ADR0036PAGE";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    @WithMockCustomUser(role = "ADMIN", username = DEPT_JOB_ACTOR, esntlId = DEPT_JOB_ACTOR)
    @DisplayName("Pageable 목록: page=1·2 는 겹치지 않고 응답 page 가 요청과 같으며, 옛 이름은 별칭으로 받는다")
    void pageableListIsOneBasedAndAliased() throws Exception {
        userRepository.saveAndFlush(User.builder()
                .esntlId(DEPT_JOB_ACTOR).userId(DEPT_JOB_ACTOR).userNm("규약 시험 주체")
                .pswd("not-a-login-credential").userSttsCd("P")
                .build());
        for (int i = 1; i <= 3; i++) {
            mockMvc.perform(post("/api/v1/dept-jobs").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"deptTaskNm\":\"규약 부서 업무 " + i + "\",\"deptTaskCn\":\"본문\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value(201))
                    .andExpect(jsonPath("$.data").isNumber());
        }

        JsonNode first = data(mockMvc.perform(get("/api/v1/dept-jobs").param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andReturn());
        JsonNode second = data(mockMvc.perform(get("/api/v1/dept-jobs").param("page", "2").param("size", "2"))
                .andExpect(status().isOk()).andReturn());

        assertThat(first.get("page").asInt()).isEqualTo(1);
        assertThat(second.get("page").asInt()).isEqualTo(2);
        assertThat(first.get("total").asLong()).isGreaterThanOrEqualTo(3);
        assertThat(first.get("list")).hasSize(2);
        assertThat(ids(first, "deptTaskSn")).doesNotContainAnyElementsOf(ids(second, "deptTaskSn"));

        JsonNode aliased = data(mockMvc.perform(get("/api/v1/dept-jobs").param("pageIndex", "2").param("pageUnit", "2"))
                .andExpect(status().isOk()).andReturn());
        assertThat(aliased.get("page").asInt()).isEqualTo(2);
        assertThat(ids(aliased, "deptTaskSn")).isEqualTo(ids(second, "deptTaskSn"));
    }

    @Test
    @DisplayName("BaseSearchDto 목록: page=1·2 는 겹치지 않고 응답 page 가 요청과 같으며, 옛 이름은 별칭으로 받는다")
    void baseSearchListIsOneBasedAndAliased() throws Exception {
        for (int i = 1; i <= 3; i++) {
            String clsfCd = "ADR36CL" + i;
            mockMvc.perform(post("/api/v1/admin/system/codes/cl").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"clsfCd\":\"" + clsfCd + "\",\"clsfCdNm\":\"규약 분류 " + i + "\",\"useYn\":\"Y\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value(201))
                    .andExpect(jsonPath("$.data").value(clsfCd));
        }

        JsonNode first = data(mockMvc.perform(get("/api/v1/admin/system/codes/cl").param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andReturn());
        JsonNode second = data(mockMvc.perform(get("/api/v1/admin/system/codes/cl").param("page", "2").param("size", "2"))
                .andExpect(status().isOk()).andReturn());

        assertThat(first.get("page").asInt()).isEqualTo(1);
        assertThat(second.get("page").asInt()).isEqualTo(2);
        assertThat(first.get("list")).hasSize(2);
        assertThat(ids(first, "clsfCd")).doesNotContainAnyElementsOf(ids(second, "clsfCd"));

        JsonNode aliased = data(mockMvc.perform(get("/api/v1/admin/system/codes/cl").param("pageIndex", "2").param("pageUnit", "2"))
                .andExpect(status().isOk()).andReturn());
        assertThat(aliased.get("page").asInt()).isEqualTo(2);
        assertThat(ids(aliased, "clsfCd")).isEqualTo(ids(second, "clsfCd"));
    }

    @Test
    @DisplayName("옛 0 기반 page=0·범위 밖 size·읽지 않던 옛 이름·새 이름과 겹친 별칭은 400 이다")
    void invalidPagingInputIsRejected() throws Exception {
        for (String path : List.of("/api/v1/dept-jobs", "/api/v1/admin/system/codes/cl")) {
            for (String[] query : List.of(
                    new String[] {"page", "0"}, new String[] {"page", "-1"}, new String[] {"page", "abc"},
                    new String[] {"size", "0"}, new String[] {"size", "101"},
                    new String[] {"pageNo", "1"}, new String[] {"pageSize", "10"},
                    new String[] {"recordCountPerPage", "10"}, new String[] {"firstIndex", "0"})) {
                mockMvc.perform(get(path).param(query[0], query[1]))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.status").value(400))
                        .andExpect(jsonPath("$.errors[0].field").value(query[0]));
            }
            mockMvc.perform(get(path).param("page", "1").param("pageIndex", "1"))
                    .andExpect(status().isBadRequest());
            mockMvc.perform(get(path).param("pageUnit", "101"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("size"));
        }
    }

    private JsonNode data(MvcResult result) throws Exception {
        return jsonMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    /** 목록 행의 식별자 — 부서 업무는 숫자, 분류코드는 문자열이라 문자열로 비교한다. */
    private static List<String> ids(JsonNode page, String field) {
        List<String> ids = new ArrayList<>();
        page.get("list").forEach(row -> ids.add(row.get(field).asString()));
        return ids;
    }
}
