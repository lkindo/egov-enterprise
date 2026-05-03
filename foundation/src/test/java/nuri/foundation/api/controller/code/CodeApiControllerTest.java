package nuri.foundation.api.controller.code;

import nuri.foundation.service.code.AdministCodeService;
import nuri.foundation.service.code.InstitutionCodeService;
import nuri.foundation.service.code.CommonCodeService;
import nuri.foundation.service.code.dto.CmmnClCodeDto;
import nuri.foundation.service.code.dto.CmmnCodeDto;
import nuri.foundation.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.service.code.dto.AdministCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({CommonCodeApiController.class, AdministCodeApiController.class, InstitutionCodeApiController.class})
@DisplayName("Code API Controllers 단위 테스트")
class CodeApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommonCodeService commonCodeService;

    @MockitoBean
    private AdministCodeService administCodeService;

    @MockitoBean
    private InstitutionCodeService institutionCodeService;

    @MockitoBean
    private JPAQueryFactory jpaQueryFactory;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("공통코드 목록 조회 테스트")
    void getCmmnCodeListTest() throws Exception {
        given(commonCodeService.selectCmmnCodeList(any())).willReturn(List.of(new CmmnCodeDto()));
        mockMvc.perform(get("/api/v1/admin/system/codes/cmmn"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("행정코드 목록 조회 테스트")
    void getAdministCodeListTest() throws Exception {
        Page<AdministCodeDto> page = new PageImpl<>(List.of(new AdministCodeDto()));
        given(administCodeService.getAdministCodeList(any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/codes/administ")
                        .param("pageIndex", "1")
                        .param("pageUnit", "10"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("기관코드 목록 조회 테스트")
    void getInstitutionCodeListTest() throws Exception {
        Page<InstitutionCodeDto> page = new PageImpl<>(List.of(new InstitutionCodeDto()));
        given(institutionCodeService.getInstitutionCodeList(any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/codes/institution")
                        .param("pageIndex", "1")
                        .param("pageUnit", "10"))
                .andExpect(status().isOk());
    }
}
