package nuri.business.service.menu;

import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
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

    // [2026-10-04 프로그램 목록 퇴역] 프로그램 원장의 레거시 URL(/uss/olh/faq/ 등)로 경로를 추정하던 분기와 그 테스트를 걷었다.
    // 원장을 읽는 코드가 없으므로 남는 추정은 아래 레거시 파일명 기반뿐이다.

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

    private void verifyProgramName(String progName, String expectedModernRoute) {
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm(progName).build();
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));
        
        MenuDto dto = menuService.selectMenuManage(1L);
        assertThat(dto.getChkURL()).isEqualTo(expectedModernRoute);
    }
}
