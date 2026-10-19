package nuri.api.controller.business.note;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMapping;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 쪽지 표면의 잘못된 입력이 500 이 아니라 400 으로 끝나는지 실제 저장소 위에서 확인한다.
 *
 * <p>[2026-09-24 ZAP API 스캔] 쪽지 목록은 {@code @Query} 에 정렬을 붙이므로 없는 필드는 Hibernate 가, 정렬 식이
 * 아닌 값은 Spring Data 가 거부한다. 둘 다 500 이었다.
 *
 * <p>[2026-10-13 T2 첫 실행, run 38275695802] 이 확인은 게시판 요청 DTO 를 쓰는 협업 입력 오류 시험에 있었다. 그 클래스는
 * 게시판과 함께 남으므로 쪽지가 없는 게시판 폐포(게시판·댓글과 도움말·스크랩·커뮤니티)에서 쪽지 API 를 불러 404 로 붉었다.
 * 쪽지 컨트롤러를 코드로 참조하는 이 클래스로 옮겨, 쪽지가 빠진 생성물에서는 쪽지와 함께 빠진다.
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
class NoteInputErrorIntegrationTest {

    /** 받은 쪽지 목록. 경로를 컨트롤러에서 읽어 이 클래스가 쪽지 컨트롤러와 함께 남고 빠지게 한다. */
    private static final String RECEIVED = NoteApiController.class.getAnnotation(RequestMapping.class).value()[0] + "/received";

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("없는 필드나 정렬 식이 아닌 값으로 정렬하면 400 이고, 올바른 정렬은 그대로 통과한다")
    void invalidSortIsBadRequestAndValidSortStillWorks() throws Exception {
        for (String sort : new String[] {"nope", "[noteRcptnSn,DESC]"}) {
            mvc.perform(get(RECEIVED).param("page", "1").param("size", "10").param("sort", sort))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("C001"));
        }
        mvc.perform(get(RECEIVED).param("page", "1").param("size", "10").param("sort", "noteRcptnSn,DESC"))
                .andExpect(status().isOk());
    }
}
