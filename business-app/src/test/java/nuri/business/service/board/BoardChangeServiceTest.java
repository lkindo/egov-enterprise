package nuri.business.service.board;

import nuri.business.domain.board.BoardChange;
import nuri.business.domain.board.BoardChangeRepository;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.BoardChangeDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("게시판 변경 이력 조회(ADR-0040 결정 9)")
class BoardChangeServiceTest {

    private static final Pageable PAGE = PageRequest.of(0, 20);

    @Mock
    private BoardChangeRepository changeRepository;
    @Mock
    private BoardMasterRepository boardMasterRepository;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private BoardChangeService service;

    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class);
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    @Test
    @DisplayName("게시물 조회 대행 권한이 없으면 게시판 행(BBS)만 읽는다 — 게시물 탭 권한을 돌아가지 않는다(H3)")
    void boardRowsOnlyWithoutReadAll() {
        given(boardMasterRepository.existsById("BBS_01")).willReturn(true);
        security.when(() -> SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(false);
        given(changeRepository.findByBbsIdAndChgTrgtTypeCdOrderByCrtDtDescBbsChgHstrySnDesc("BBS_01", "BBS", PAGE))
                .willReturn(new PageImpl<>(List.of(change("BBS", null, "USR_A"))));
        User actor = mock(User.class);
        given(actor.getEsntlId()).willReturn("USR_A");
        given(actor.getUserNm()).willReturn("운영자");
        given(userRepository.findByEsntlIdIn(List.of("USR_A"))).willReturn(List.of(actor));

        Page<BoardChangeDto> page = service.getChanges("BBS_01", PAGE);

        assertThat(page.getContent()).singleElement().satisfies(row -> {
            assertThat(row.chgTrgtTypeCd()).isEqualTo("BBS");
            assertThat(row.chgUserNm()).isEqualTo("운영자");
        });
        verify(changeRepository, never()).findByBbsIdOrderByCrtDtDescBbsChgHstrySnDesc(anyString(), any());
    }

    @Test
    @DisplayName("게시물 조회 대행 권한이 있으면 게시글 행까지 읽고, 이름을 못 찾은 변경자는 null 이다")
    void allRowsWithReadAll() {
        given(boardMasterRepository.existsById("BBS_01")).willReturn(true);
        security.when(() -> SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
        given(changeRepository.findByBbsIdOrderByCrtDtDescBbsChgHstrySnDesc("BBS_01", PAGE))
                .willReturn(new PageImpl<>(List.of(change("PST", 7L, "USR_GONE"), change("BBS", null, null))));
        given(userRepository.findByEsntlIdIn(List.of("USR_GONE"))).willReturn(List.of());

        Page<BoardChangeDto> page = service.getChanges("BBS_01", PAGE);

        assertThat(page.getContent()).extracting(BoardChangeDto::chgTrgtTypeCd).containsExactly("PST", "BBS");
        assertThat(page.getContent().get(0).pstSn()).isEqualTo(7L);
        assertThat(page.getContent()).extracting(BoardChangeDto::chgUserNm).containsOnlyNulls();
        verify(changeRepository, never()).findByBbsIdAndChgTrgtTypeCdOrderByCrtDtDescBbsChgHstrySnDesc(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("없는 게시판이면 이력을 읽지 않고 404 다")
    void missingBoardIsNotFound() {
        given(boardMasterRepository.existsById("NONE")).willReturn(false);

        assertThatThrownBy(() -> service.getChanges("NONE", PAGE))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(changeRepository, userRepository);
    }

    private static BoardChange change(String target, Long pstSn, String actor) {
        return BoardChange.builder()
                .chgTrgtTypeCd(target)
                .chgTypeCd("PST".equals(target) ? "PIN" : "USE")
                .bbsId("BBS_01")
                .pstSn(pstSn)
                .chgArtclNm("항목")
                .chgBfrCn("N")
                .chgAftrCn("Y")
                .chgUserIdntfr(actor)
                .frstRgtrId("admin")
                .crtDt(LocalDateTime.of(2026, 10, 23, 9, 0))
                .build();
    }
}
