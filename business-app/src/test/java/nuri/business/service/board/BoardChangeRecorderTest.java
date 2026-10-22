package nuri.business.service.board;

import nuri.business.domain.board.BoardChange;
import nuri.business.domain.board.BoardChangeRepository;
import nuri.business.security.util.SecurityUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("게시판 변경 이력 기록기(ADR-0040 결정 9)")
class BoardChangeRecorderTest {

    @Mock
    private BoardChangeRepository repository;

    private MockedStatic<SecurityUtil> security;
    private BoardChangeRecorder recorder;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class);
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("USRCNFRM_00000000001"));
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("admin"));
        recorder = new BoardChangeRecorder(repository);
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    @Test
    @DisplayName("바뀐 게시판 항목은 대상 BBS·게시글 번호 없이 전후 값과 변경자를 한 건 남긴다")
    void recordsChangedBoardItem() {
        recorder.recordBoard("BBS_01", BoardChangeRecorder.ChangeType.SETTING, "첨부 파일 수", 1, 5);

        BoardChange saved = captured();
        assertThat(saved.getChgTrgtTypeCd()).isEqualTo("BBS");
        assertThat(saved.getChgTypeCd()).isEqualTo("SETTING");
        assertThat(saved.getBbsId()).isEqualTo("BBS_01");
        assertThat(saved.getPstSn()).isNull();
        assertThat(saved.getChgArtclNm()).isEqualTo("첨부 파일 수");
        assertThat(saved.getChgBfrCn()).isEqualTo("1");
        assertThat(saved.getChgAftrCn()).isEqualTo("5");
        assertThat(saved.getChgUserIdntfr()).isEqualTo("USRCNFRM_00000000001");
        assertThat(saved.getFrstRgtrId()).isEqualTo("admin");
        assertThat(saved.getCrtDt()).isNotNull();
    }

    @Test
    @DisplayName("게시글 항목은 대상 PST 와 게시글 번호를 남긴다")
    void recordsPostItemWithPostNumber() {
        recorder.recordPost("BBS_01", 42L, BoardChangeRecorder.ChangeType.PIN, "상단 고정", null, "Y");

        BoardChange saved = captured();
        assertThat(saved.getChgTrgtTypeCd()).isEqualTo("PST");
        assertThat(saved.getChgTypeCd()).isEqualTo("PIN");
        assertThat(saved.getPstSn()).isEqualTo(42L);
        assertThat(saved.getChgBfrCn()).isNull();
        assertThat(saved.getChgAftrCn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("전후 값이 같으면(둘 다 없음 포함) 남기지 않는다")
    void skipsUnchangedValues() {
        recorder.recordBoard("BBS_01", BoardChangeRecorder.ChangeType.SETTING, "게시판 명칭", "공지", "공지");
        recorder.recordBoard("BBS_01", BoardChangeRecorder.ChangeType.SETTING, "게시판 소개", null, null);
        recorder.recordBoard("BBS_01", BoardChangeRecorder.ChangeType.SETTING, "첨부 파일 수", 3, 3);

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("로그인 주체가 없으면 변경자 없이 SYSTEM 으로 남기고, 4000자를 넘는 값은 자른다")
    void systemActorAndClippedValues() {
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.empty());
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.empty());

        recorder.recordBoard("BBS_01", BoardChangeRecorder.ChangeType.SETTING, "게시판 소개", "가".repeat(4001), "짧은 소개");

        BoardChange saved = captured();
        assertThat(saved.getChgUserIdntfr()).isNull();
        assertThat(saved.getFrstRgtrId()).isEqualTo("SYSTEM");
        assertThat(saved.getChgBfrCn()).hasSize(4000);
    }

    private BoardChange captured() {
        ArgumentCaptor<BoardChange> captor = ArgumentCaptor.forClass(BoardChange.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }
}
