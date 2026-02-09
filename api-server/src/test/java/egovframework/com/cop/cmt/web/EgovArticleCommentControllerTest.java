package egovframework.com.cop.cmt.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;

import org.springframework.test.web.servlet.MockMvc;

import com.company.project.service.comment.EgovCommentService;
import com.company.project.service.comment.dto.CommentDto;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;

import org.egovframe.rte.fdl.property.EgovPropertyService;

@WebMvcTest(controllers = EgovArticleCommentController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(EgovArticleCommentController.class)
public class EgovArticleCommentControllerTest {

    @SpringBootApplication
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean(name = "egovCommentService")
    private EgovCommentService egovCommentService;

    @MockBean(name = "propertiesService")
    private EgovPropertyService propertyService;

    @MockBean(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @MockBean
    private EgovUserDetailsService egovUserDetailsService;

    @BeforeEach
    void setUp() {
        // Mock Authentication
        LoginVO loginVO = new LoginVO();
        loginVO.setUniqId("TEST_USER_ID");
        loginVO.setName("TEST_USER_NAME");

        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);
        when(egovUserDetailsService.getAuthenticatedUser()).thenReturn(loginVO);

        new EgovUserDetailsHelper().setEgovUserDetailsService(egovUserDetailsService);

        // Mock PropertyService
        when(propertyService.getInt("pageUnit")).thenReturn(10);
        when(propertyService.getInt("pageSize")).thenReturn(10);
    }

    @Test
    void updateArticleCommentView_validId_populatesModel() throws Exception {
        Long commentId = 123L;
        String commentCn = "Test Comment Content";

        CommentDto mockDto = CommentDto.builder()
                .commentNo(commentId)
                .commentCn(commentCn)
                .nttId(10L)
                .bbsId("BBS_1")
                .wrterId("TEST_USER_ID")
                .wrterNm("TEST_USER_NAME")
                .build();

        // Mock getComment call
        when(egovCommentService.getComment(commentId)).thenReturn(mockDto);

        // Mock getCommentList call (controller calls this too)
        when(egovCommentService.getCommentList(any(), any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(post("/cop/cmt/updateArticleCommentView.do")
                .param("commentNo", String.valueOf(commentId))
                .param("bbsId", "BBS_1")
                .param("nttId", "10"))
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/cop/cmt/EgovArticleCommentList"))
                .andExpect(model().attributeExists("articleCommentVO"))
                .andExpect(model().attribute("articleCommentVO",
                        org.hamcrest.Matchers.hasProperty("commentCn", org.hamcrest.Matchers.is(commentCn))));

        verify(egovCommentService).getComment(commentId);
    }

    @Test
    void updateArticleCommentView_invalidId_handlesGracefully() throws Exception {
        Long commentId = 999L;

        // Mock getComment call to return null
        when(egovCommentService.getComment(commentId)).thenReturn(null);

        // Mock getCommentList call
        when(egovCommentService.getCommentList(any(), any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(post("/cop/cmt/updateArticleCommentView.do")
                .param("commentNo", String.valueOf(commentId))
                .param("bbsId", "BBS_1")
                .param("nttId", "10"))
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/cop/cmt/EgovArticleCommentList"))
                .andExpect(model().attributeExists("articleCommentVO"));

        // Ensure that articleCommentVO is not null (it should be an empty VO)
    }
}
