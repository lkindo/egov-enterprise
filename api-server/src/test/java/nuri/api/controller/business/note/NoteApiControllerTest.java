package nuri.api.controller.business.note;

import nuri.business.service.note.NoteService;
import nuri.business.service.note.dto.NoteDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(NoteApiController.class)
@DisplayName("NoteApiController 단위 테스트")
class NoteApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private NoteService noteService;

    @Test
    @WithMockCustomUser(username = "testuser", esntlId = "testuser")
    @DisplayName("수신 쪽지 목록 조회 테스트")
    void getReceivedNotesTest() throws Exception {
        Page<NoteDto> page = new PageImpl<>(List.of(NoteDto.builder().noteId("N1").build()));
        given(noteService.getReceivedNotes(eq("testuser"), any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/notes/received")
                        .param("searchWrd", "word"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].noteId").value("N1"));
    }

    @Test
    @WithMockCustomUser(username = "testuser", esntlId = "testuser")
    @DisplayName("발신 쪽지 목록 조회 테스트")
    void getSentNotesTest() throws Exception {
        Page<NoteDto> page = new PageImpl<>(List.of(NoteDto.builder().noteId("N1").build()));
        given(noteService.getSentNotes(eq("testuser"), any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/notes/sent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].noteId").value("N1"));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("쪽지 상세 조회 테스트")
    void getNoteTest() throws Exception {
        NoteDto dto = NoteDto.builder().noteId("N1").build();
        given(noteService.getNoteDetail("N1", "recv", "R1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/notes/N1")
                        .param("type", "recv")
                        .param("relationId", "R1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.noteId").value("N1"));
    }

    @Test
    @WithMockCustomUser(username = "testuser", esntlId = "testuser")
    @DisplayName("쪽지 발송 테스트")
    void sendNoteTest() throws Exception {
        mockMvc.perform(post("/api/v1/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"noteSj\":\"Test Subject\", \"noteCn\":\"Test Content\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("쪽지 삭제 테스트")
    void deleteNoteTest() throws Exception {
        mockMvc.perform(delete("/api/v1/notes/R1")
                        .with(csrf())
                        .param("type", "recv"))
                .andExpect(status().isOk());
    }
}
