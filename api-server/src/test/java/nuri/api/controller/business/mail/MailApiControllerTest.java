package nuri.api.controller.business.mail;

import nuri.business.service.mail.MailService;
import nuri.business.service.mail.MailUserRateLimiter;
import nuri.business.service.mail.dto.SentMailDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(MailApiController.class)
@DisplayName("MailApiController 단위 테스트")
class MailApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private MailService mailService;

    @Test
    @WithMockCustomUser
    @DisplayName("발신 메일 목록 조회")
    void getSentMails() throws Exception {
        Page<SentMailDto> page = new PageImpl<>(List.of(SentMailDto.builder().emlDsptchSn(1L).build()));
        given(mailService.getSentMailList(any(), any(), any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/mails"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].emlDsptchSn").value(1));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("발신 메일 상세 조회")
    void getSentMail() throws Exception {
        SentMailDto dto = SentMailDto.builder().emlDsptchSn(1L).sj("Subject").build();
        given(mailService.getSentMail(1L)).willReturn(dto);

        mockMvc.perform(get("/api/v1/mails/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.emlDsptchSn").value(1));
    }

    @Test
    @WithMockCustomUser(username = "testuser", esntlId = "testuser")
    @DisplayName("메일 발송")
    void sendMail() throws Exception {
        SentMailDto dto = SentMailDto.builder().sj("Subject").emailCn("Content").build();
        given(mailService.sendMail(anyString(), any())).willReturn(123L);

        mockMvc.perform(post("/api/v1/mails")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data").value(123));
    }

    /**
     * 본문 컬럼({@code tb_eml_dsptch.eml_cn})은 4000자다. 종전에는 DTO 에 상한이 없어 4001자 본문이
     * DB 오류(500)로 끝났다. 수신자 목록의 null 항목은 서비스가 {@code recipient.getEsntlId()} 에서 NPE 로 죽었다.
     */
    @Test
    @WithMockCustomUser(username = "testuser", esntlId = "testuser")
    @DisplayName("메일 발송: 컬럼보다 긴 본문과 null 수신자 항목은 서비스에 닿기 전에 400 이다")
    void sendMailRejectsOverlongBodyAndNullRecipient() throws Exception {
        SentMailDto overlong = SentMailDto.builder().sj("Subject").emailCn("가".repeat(4001)).build();
        mockMvc.perform(post("/api/v1/mails")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overlong)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/mails")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sj\":\"Subject\",\"emailCn\":\"Content\",\"recipients\":[null]}"))
                .andExpect(status().isBadRequest());

        verify(mailService, never()).sendMail(anyString(), any());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("메일 삭제")
    void deleteMail() throws Exception {
        mockMvc.perform(delete("/api/v1/mails/1").with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("[DIP B5 F7] 발송 가능 상태는 SMTP 연결 여부를 싣는다 — 경로 변수 조회와 겹치지 않는다")
    void getDeliveryStatus() throws Exception {
        given(mailService.getDeliveryStatus())
                .willReturn(new nuri.business.service.mail.dto.MailDeliveryStatusDto(false, "LoggingEmailSender"));

        mockMvc.perform(get("/api/v1/mails/delivery-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deliveryConfigured").value(false));
        verify(mailService, never()).getSentMail(any());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("[DIP B5 F7] 재발송은 경로의 발신 번호를 서비스로 넘기고, 서비스 판정 오류를 그대로 돌려준다")
    void resendMail() throws Exception {
        mockMvc.perform(post("/api/v1/mails/7/resend").with(csrf()))
                .andExpect(status().isOk());
        verify(mailService).resendMail(7L);

        org.mockito.Mockito.doThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION, "처리 중"))
                .when(mailService).resendMail(8L);
        mockMvc.perform(post("/api/v1/mails/8/resend").with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockCustomUser(username = "testuser", esntlId = "testuser")
    @DisplayName("[GAP-MAIL-001 ②] 사용자별 발송 한도 초과 시 HTTP 429(C015)를 반환한다")
    void sendMailRateLimitedReturns429() throws Exception {
        SentMailDto dto = SentMailDto.builder().sj("Subject").emailCn("Content").recptnPerson("a@example.com").build();
        given(mailService.sendMail(anyString(), any()))
                .willThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.TOO_MANY_REQUESTS,
                        "시간당 메일 발송 한도(30건)를 초과했습니다."));

        mockMvc.perform(post("/api/v1/mails")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("C015"));
    }

    @Test
    @DisplayName("[GAP-MAIL-001 ②] application.yml 의 메일 발송 한도 기본값이 MailUserRateLimiter 와 일치한다")
    void mailRateLimitDefaultMatchesApplicationYml() throws Exception {
        java.nio.file.Path file = java.nio.file.Path.of("src/main/resources", "application.yml");
        if (!java.nio.file.Files.exists(file)) {
            file = java.nio.file.Path.of("api-server/src/main/resources", "application.yml");
        }
        List<PropertySource<?>> sources = new YamlPropertySourceLoader().load("application.yml", new FileSystemResource(file));
        Object value = sources.stream()
                .map(source -> source.getProperty("nuri.mail.rate-limit.dispatches-per-hour"))
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
        org.assertj.core.api.Assertions.assertThat(value).isNotNull();
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("^\\$\\{([A-Z_]+):(\\d+)}$")
                .matcher(value.toString());
        org.assertj.core.api.Assertions.assertThat(matcher.matches()).isTrue();
        org.assertj.core.api.Assertions.assertThat(matcher.group(1)).isEqualTo("MAIL_RATE_LIMIT_DISPATCHES_PER_HOUR");
        org.assertj.core.api.Assertions.assertThat(Integer.parseInt(matcher.group(2)))
                .isEqualTo(MailUserRateLimiter.DEFAULT_DISPATCHES_PER_HOUR)
                .isBetween(1, 100);
    }
}
