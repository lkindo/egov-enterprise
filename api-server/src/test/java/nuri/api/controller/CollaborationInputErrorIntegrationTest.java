package nuri.api.controller;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * collaboration pack 표면의 잘못된 입력이 500 이 아니라 400 으로 끝나는지 실제 저장소 위에서 확인한다.
 *
 * <p>[2026-09-24 ZAP API 스캔] 쪽지 목록은 {@code @Query} 에 정렬을 붙이므로 없는 필드는 Hibernate 가, 정렬 식이
 * 아닌 값은 Spring Data 가 거부한다. 둘 다 500 이었다. 게시글 첨부 등록·수정은 {@code @Valid} 가 없어 JSON 경로의
 * 입력 검사를 통째로 건너뛰었다. 게시판 요청 DTO 를 직접 써서 이 파일은 collaboration 이 빠진 프로필에서 함께
 * 빠진다(core 표면은 {@link ClientInputErrorIntegrationTest}).
 */
@ApiHttpIntegrationTest
@WithMockCustomUser(role = "ADMIN")
class CollaborationInputErrorIntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("필수 요청 파라미터가 없으면 400 이고 빠진 이름을 알려 준다")
    void missingRequiredParameterIsBadRequest() throws Exception {
        mvc.perform(get("/api/v1/comments"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("pstSn")));
    }

    @Test
    @DisplayName("없는 필드나 정렬 식이 아닌 값으로 정렬하면 400 이고, 올바른 정렬은 그대로 통과한다")
    void invalidSortIsBadRequestAndValidSortStillWorks() throws Exception {
        for (String sort : new String[] {"nope", "[noteRcptnSn,DESC]"}) {
            mvc.perform(get("/api/v1/notes/received").param("page", "0").param("size", "10").param("sort", sort))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("C001"));
        }
        mvc.perform(get("/api/v1/notes/received").param("page", "0").param("size", "10").param("sort", "noteRcptnSn,DESC"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("첨부 포함 게시글 등록·수정도 JSON 경로와 같은 입력 검사를 거친다")
    void multipartBoardWritesAreValidatedLikeJson() throws Exception {
        var missingTitle = boardPart(new BoardSaveRequest("BBS_000000000001", null, "본문",
                null, null, null, null, null, null, null, null, null));
        // ZAP 은 file 에 파일이 아닌 긴 글자를 보냈다 — 검사가 없으면 서비스가 실패하고 500 이 됐다.
        var textFile = new MockMultipartFile("file", "", "text/plain",
                "gwRfhGmPbYIWWuJkEruocLgeZoLpJEfhTeeKGcItkvmaiuySMKaOLuNZlqqg".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/v1/boards/BBS_000000000001/posts/with-files").file(missingTitle).file(textFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("pstTtl")));

        var tooLong = boardPart(new BoardSaveRequest("BBS_000000000001", "제목", "가".repeat(4001),
                null, null, null, null, null, null, null, null, null));
        mvc.perform(multipart(HttpMethod.PUT, "/api/v1/boards/BBS_000000000001/posts/1/with-files").file(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("pstCn")));
    }

    private static MockMultipartFile boardPart(BoardSaveRequest request) {
        return new MockMultipartFile("board", "", "application/json",
                JSON.writeValueAsString(request).getBytes(StandardCharsets.UTF_8));
    }
}
