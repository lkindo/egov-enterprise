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

//    @Test
//    @DisplayName("게시판 생성 실패 - 중복 ID")
//    void createBoardMaster_fail_duplicateId() {
//        // given
//        BoardMasterDto boardMasterDto = BoardMasterDto.builder()
//                .bbsId("BBS_0000000001")
//                .build();
//        BoardMaster existingBoardMaster = BoardMaster.builder()
//                .bbsId("BBS_0000000001")
//                .build();
//
//        // when
//        // No duplicate check in createBoardMaster yet, but let's assume it should fail if we add it
//        // Or if the test expects some validation
//    }

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
