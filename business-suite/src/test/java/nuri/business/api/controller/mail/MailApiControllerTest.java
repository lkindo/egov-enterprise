package nuri.business.api.controller.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MailApiController.class)
@DisplayName("MailApiController 단위 테스트")
class MailApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MailService mailService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser
    @DisplayName("발신 메일 목록 조회")
    void getSentMails() throws Exception {
        Page<SentMailDto> page = new PageImpl<>(List.of(SentMailDto.builder().mssageId("M1").build()));
        given(mailService.getSentMailList(any(), any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/mails"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].mssageId").value("M1"));
    }

    @Test
    @WithMockUser
    @DisplayName("발신 메일 상세 조회")
    void getSentMail() throws Exception {
        SentMailDto dto = SentMailDto.builder().mssageId("M1").sj("Subject").build();
        given(mailService.getSentMail("M1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/mails/M1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mssageId").value("M1"));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("메일 발송")
    void sendMail() throws Exception {
        SentMailDto dto = SentMailDto.builder().sj("Subject").emailCn("Content").build();
        given(mailService.sendMail(anyString(), any())).willReturn("MAIL_123");

        mockMvc.perform(post("/api/v1/mails")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("MAIL_123"));
    }

    @Test
    @WithMockUser
    @DisplayName("메일 삭제")
    void deleteMail() throws Exception {
        mockMvc.perform(delete("/api/v1/mails/M1").with(csrf()))
                .andExpect(status().isOk());
    }
}
