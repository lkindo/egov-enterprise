package nuri.business.service.menu;

import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.menu.dto.MenuDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuService 브랜치 커버리지 보완 테스트")
class MenuServiceBranchTest {

    @InjectMocks
    private MenuService menuService;

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Test
    @DisplayName("calculateUrl - 다양한 레거시 URL 패턴 추론 테스트")
    void calculateUrl_LegacyPatterns() {
        // 1. /uss/olh/faq/ -> /admin/help/faq
        verifyLegacyUrl("/uss/olh/faq/FaqList.do", "/admin/help/faq");
        
        // 2. /sec/gmt/ -> /admin/security/group
        verifyLegacyUrl("/sec/gmt/GroupList.do", "/admin/security/group");
        
        // 3. /sec/ram/ -> /admin/security/role
        verifyLegacyUrl("/sec/ram/RoleList.do", "/admin/security/role");
        
        // 4. /sym/ccm/ -> /admin/system/common-code
        verifyLegacyUrl("/sym/ccm/CommonCode.do", "/admin/system/common-code");
        
        // 5. /uss/olp/qtm/ -> /admin/survey/templates
        verifyLegacyUrl("/uss/olp/qtm/TmplatList.do", "/admin/survey/templates");
        
        // 6. /uss/olp/qmc/ -> /admin/survey/manage
        verifyLegacyUrl("/uss/olp/qmc/QestnrList.do", "/admin/survey/manage");
    }

    @Test
    @DisplayName("calculateUrl - 현대적 프로그램명 기반 추론 테스트")
    void calculateUrl_ModernProgramNames() {
        verifyProgramName("BoardManage", "/admin/community/boards");
        verifyProgramName("BBSMaster", "/admin/community");
        verifyProgramName("CmmCode", "/admin/system/common-code");
        verifyProgramName("GroupList", "/admin/security/group");
        verifyProgramName("RoleList", "/admin/security/role");
        verifyProgramName("AuthorGroup", "/admin/security/authority");
        verifyProgramName("QustnrManage", "/admin/survey/manage");
        verifyProgramName("QustnrTmplat", "/admin/survey/templates");
        verifyProgramName("AdbkList", "/admin/collaboration/address-book");
        verifyProgramName("FaqList", "/admin/help/faq");
        verifyProgramName("CnsltList", "/admin/help/qna");
        verifyProgramName("MainImage", "/admin/system/banner");
        verifyProgramName("FileMng", "/admin/system/files");
        verifyProgramName("ProgramList", "/admin/system/programs");
        verifyProgramName("MenuCreat", "/admin/system/menus/by-authority");
        verifyProgramName("MenuList", "/admin/system/menus");
    }

    private void verifyLegacyUrl(String legacyUrl, String expectedModernRoute) {
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm("LegacyProg").build();
        Program program = Program.builder().prgrmFileNm("LegacyProg").url(legacyUrl).build();
        
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        given(programRepository.findById("LegacyProg")).willReturn(Optional.of(program));
        
        MenuDto dto = menuService.selectMenuManage(1L);
        assertThat(dto.getChkURL()).isEqualTo(expectedModernRoute);
    }

    private void verifyProgramName(String progName, String expectedModernRoute) {
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm(progName).build();
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        
        MenuDto dto = menuService.selectMenuManage(1L);
        assertThat(dto.getChkURL()).isEqualTo(expectedModernRoute);
    }
}
