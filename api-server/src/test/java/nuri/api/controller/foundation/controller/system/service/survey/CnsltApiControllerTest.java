package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.system.service.consult.EgovCnsltService;
import nuri.business.service.system.service.consult.dto.CnsltManageDto;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class CnsltApiControllerTest extends BaseControllerTest {

    private EgovCnsltService cnsltService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        cnsltService = mock(EgovCnsltService.class);
        return new CnsltApiController(cnsltService);
    }

    @Test
    public void getConsultations_ShouldReturnPagedList() throws Exception {
        CnsltManageDto dto = CnsltManageDto.builder()
                .dscsnId("CNSLT_001")
                .dscsnTtl("시스템 연동 문의")
                .dscsnCn("차세대 표준 프레임워크 연동 질문입니다.")
                .wrterNm("홍길동")
                .qnaProcSttsCd("3")
                .build();
        Page<CnsltManageDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(cnsltService.getCnsltList(eq("시스템"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/cnslt")
                .param("keyword", "시스템")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].dscsnId").value("CNSLT_001"))
                .andExpect(jsonPath("$.data.list[0].dscsnTtl").value("시스템 연동 문의"))
                .andExpect(jsonPath("$.data.list[0].wrterNm").value("홍길동"));
    }

    @Test
    public void getConsultation_ShouldReturnDetail() throws Exception {
        CnsltManageDto dto = CnsltManageDto.builder()
                .dscsnId("CNSLT_001")
                .dscsnTtl("시스템 연동 문의")
                .dscsnCn("차세대 표준 프레임워크 연동 질문입니다.")
                .wrterNm("홍길동")
                .qnaProcSttsCd("3")
                .build();

        when(cnsltService.getCnslt("CNSLT_001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/cnslt/CNSLT_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dscsnId").value("CNSLT_001"))
                .andExpect(jsonPath("$.data.dscsnTtl").value("시스템 연동 문의"));
    }

    @Test
    public void insertConsultation_ShouldSucceed() throws Exception {
        CnsltManageDto dto = CnsltManageDto.builder()
                .dscsnTtl("신규 상담 등록")
                .dscsnCn("상담 내용")
                .wrterNm("임꺽정")
                .build();

        doNothing().when(cnsltService).insertCnslt(any(CnsltManageDto.class));

        mockMvc.perform(post("/api/v1/admin/system/cnslt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(cnsltService, times(1)).insertCnslt(any(CnsltManageDto.class));
    }

    @Test
    public void answerConsultation_ShouldSucceed() throws Exception {
        String answerCn = "상담 완료 답변 내용입니다.";

        doNothing().when(cnsltService).answerCnslt(eq("CNSLT_001"), eq(answerCn));

        mockMvc.perform(patch("/api/v1/admin/system/cnslt/CNSLT_001/answer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(answerCn)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(cnsltService, times(1)).answerCnslt(eq("CNSLT_001"), eq(answerCn));
    }
}
