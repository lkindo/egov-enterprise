package nuri.business.service.board;

import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.foundation.core.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * BoardMasterService 의 <b>서비스 분기 로직</b>만 검증하는 순수 Mockito 단위 테스트.
 *
 * <p>[의도적 미커버] "게시판 생성 실패 - 중복 bbsId" 시나리오는 여기서 다루지 않는다.
 * {@code createBoardMaster} 에는 중복 검사 분기가 없고(있어서도 안 된다 — check-then-act 경합),
 * 클라이언트가 bbsId 를 직접 지정한 경우의 중복은 DB PK 제약 위반이 flush 시점에
 * {@code DataIntegrityViolationException} 으로 올라와 {@code GlobalExceptionHandler} 가 409 로 변환한다.
 * 목(mock) {@code EntityManager} 는 flush 도 제약 검사도 하지 않으므로 이 경로는 단위 테스트로 재현 불가이며,
 * 실제 커버리지는 {@code GlobalExceptionHandlerTest}(409 변환)와 통합/E2E 계층이 담당한다.
 * bbsId 미지정 시에는 {@code IdGenerationUtil.generateUniqueId(..., existsById)} 가 채번 단계에서 충돌을 회피한다.
 */
@DisplayName("BoardMasterService 로직 테스트")
class BoardMasterServiceLogicTest {

    @Mock
    private BoardMasterRepository boardMasterRepository;

    // createBoardMaster 는 assigned-@Id 낙관적 락(409) 회피를 위해 save() 대신 entityManager.persist() 를 쓴다.
    // 해당 @PersistenceContext 필드를 목으로 주입하지 않으면 persist 호출 시 NPE 가 난다.
    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private BoardMasterService boardMasterService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // @InjectMocks 는 생성자 주입 사용 시 @PersistenceContext 필드(비생성자)는 주입하지 않으므로 수동 주입한다.
        ReflectionTestUtils.setField(boardMasterService, "entityManager", entityManager);
    }

    @Test
    @DisplayName("게시판 생성 성공")
    void createBoardMaster_success() {
        // given
        BoardMasterDto newBoardMasterDto = BoardMasterDto.builder()
                .bbsId("BBS_0000000001")
                .bbsTtl("Test Board")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .build();

        // when
        boardMasterService.createBoardMaster("user1", newBoardMasterDto);

        // then — 신규 생성은 repository.save() 가 아니라 entityManager.persist() 로 명시 INSERT 한다
        verify(entityManager, times(1)).persist(any(BoardMaster.class));
    }

    @Test
    @DisplayName("게시판 수정 성공")
    void updateBoardMaster_success() {
        // given
        String bbsId = "BBS_0000000001";
        BoardMaster existingBoardMaster = BoardMaster.builder()
                .bbsId(bbsId)
                .bbsTtl("Old Title")
                .build();
        BoardMasterDto updateDto = BoardMasterDto.builder()
                .bbsId(bbsId)
                .bbsTtl("New Title")
                .build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(existingBoardMaster));

        // when
        boardMasterService.updateBoardMaster("user1", updateDto);

        // then
        assertThat(existingBoardMaster.getBbsTtl()).isEqualTo("New Title");
    }

    @Test
    @DisplayName("게시판 수정 실패 - 존재하지 않는 ID")
    void updateBoardMaster_fail_notFound() {
        // given
        String bbsId = "BBS_0000000001";
        BoardMasterDto boardMasterDto = BoardMasterDto.builder()
                .bbsId(bbsId)
                .build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> boardMasterService.updateBoardMaster("user1", boardMasterDto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("게시판 삭제 성공")
    void deleteBoardMaster_success() {
        // given
        String bbsId = "BBS_0000000001";
        BoardMaster existingBoardMaster = BoardMaster.builder()
                .bbsId(bbsId)
                .useYn("Y")
                .build();

        when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(existingBoardMaster));

        // when
        boardMasterService.deleteBoardMaster("user1", bbsId);

        // then
        assertThat(existingBoardMaster.getUseYn()).isEqualTo("N");
    }
}
