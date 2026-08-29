package nuri.business.service.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.board.*;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterMapper;
import nuri.business.service.board.dto.BoardMasterMapperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("BoardMasterService 단위 테스트")
class BoardMasterServiceTest {

    @InjectMocks
    private BoardMasterService boardMasterService;

    @Mock
    private BoardMasterRepository boardMasterRepository;

    @Mock
    private BoardUseRepository boardUseRepository;

    @Mock
    private BoardRepository boardRepository;

    // createBoardMaster 는 save() 대신 EntityManager.persist() 로 신규 INSERT 한다(@MapsId 옵션 낙관적 락 회피)
    @Mock
    private jakarta.persistence.EntityManager entityManager;

    // 실제 MapStruct 생성 구현을 @InjectMocks 생성자에 주입 (매핑 동작 실검증)
    @Spy
    private BoardMasterMapper boardMasterMapper = new BoardMasterMapperImpl();

    @BeforeEach
    void injectEntityManager() {
        // @InjectMocks 는 생성자 주입을 사용하므로 @PersistenceContext 필드주입 대상인 entityManager 는
        // 자동 주입되지 않는다. createBoardMaster 의 persist() 경로를 위해 명시적으로 주입한다.
        ReflectionTestUtils.setField(boardMasterService, "entityManager", entityManager);
    }

    @Test
    @DisplayName("게시판 마스터 단건 조회 - 성공")
    void getBoardMaster_Success() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").bbsTtl("Test Board").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        BoardMasterDto result = boardMasterService.getBoardMaster("BBS_01");

        assertThat(result).isNotNull();
        assertThat(result.getBbsTtl()).isEqualTo("Test Board");
    }

    @Test
    @DisplayName("게시판 마스터 단건 조회 - 실패")
    void getBoardMaster_Fail() {
        given(boardMasterRepository.findById("BBS_99")).willReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> boardMasterService.getBoardMaster("BBS_99"));
    }

    @Test
    @DisplayName("게시판 마스터 목록 검색")
    void getBoardMasterList() {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        BoardMasterSearchResult searchResult = mockSearchResult("BBS_01", "Test Board");
        Page<BoardMasterSearchResult> page = new PageImpl<>(List.of(searchResult));
        
        given(boardMasterRepository.searchBoardMasters(any(), any())).willReturn(page);

        Page<BoardMasterDto> result = boardMasterService.getBoardMasterList("0", "Test", pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBbsTtl()).isEqualTo("Test Board");
    }
    
    private BoardMasterSearchResult mockSearchResult(String bbsId, String bbsTtl) {
        return BoardMasterSearchResult.builder()
                .bbsId(bbsId)
                .bbsTtl(bbsTtl)
                .bbsTypeCd("TY01")
                .bbsAtrbCd("AT01")
                .tmpltId("TMP_01")
                .useYn("Y")
                .build();
    }

    @Test
    @DisplayName("게시판 마스터 생성")
    void createBoardMaster() throws Exception {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            BoardMasterDto dto = BoardMasterDto.builder().bbsTtl("New Board").build();

            String bbsId = boardMasterService.createBoardMaster("user1", dto);

            assertThat(bbsId).startsWith("BBSMSTR_");
            verify(entityManager).persist(any(BoardMaster.class));
        }
    }

    @Test
    @DisplayName("게시판 마스터 수정")
    void updateBoardMaster() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            BoardMaster master = BoardMaster.builder().bbsId("BBS_01").bbsTtl("Old Board").build();
            given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

            BoardMasterDto dto = BoardMasterDto.builder().bbsId("BBS_01").bbsTtl("Updated Board").build();
            boardMasterService.updateBoardMaster("user1", dto);

            assertThat(master.getBbsTtl()).isEqualTo("Updated Board");
        }
    }

    @Test
    @DisplayName("게시판 마스터 삭제 (논리삭제)")
    void deleteBoardMaster() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
            given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

            boardMasterService.deleteBoardMaster("user1", "BBS_01");

            verify(boardMasterRepository).findById("BBS_01");
        }
    }

    @Test
    @DisplayName("만족도 및 댓글 사용 가능 여부 확인")
    void canUseSatisfactionAndComment() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").stsfdgYn("Y").ansYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        assertThat(boardMasterService.canUseSatisfaction("BBS_01")).isTrue();
        assertThat(boardMasterService.canUseComment("BBS_01")).isFalse();
    }

    @Test
    @DisplayName("옵션 필드(블로그, 댓글, 만족도)가 포함된 게시판 마스터 생성")
    void createBoardMaster_WithOptionalFields() throws Exception {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            BoardMasterDto dto = BoardMasterDto.builder()
                    .bbsTtl("Full Board")
                    .blogYn("Y")
                    .ansYn("Y")
                    .stsfdgYn("Y")
                    .build();

            boardMasterService.createBoardMaster("user1", dto);

            verify(entityManager).persist(argThat((BoardMaster bm) ->
                "Y".equals(bm.getBlogYn()) && "Y".equals(bm.getAnsYn()) && "Y".equals(bm.getStsfdgYn())
            ));
        }
    }

    @Test
    @DisplayName("게시판을 찾을 수 없는 경우 만족도/댓글 사용 여부 false 반환")
    void canUse_NotFound() {
        given(boardMasterRepository.findById("INVALID")).willReturn(Optional.empty());

        assertThat(boardMasterService.canUseSatisfaction("INVALID")).isFalse();
        assertThat(boardMasterService.canUseComment("INVALID")).isFalse();
    }

    @Test
    @DisplayName("게시판 수정 - DTO 값이 모두 null일 때 기존 엔티티 값 유지")
    void updateBoardMaster_NullDtoValues() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000001")
                .bbsTtl("Old Title")
                .bbsExpln("Old Expln")
                .ansPsbltyYn("N")
                .fileAtchPsbltyYn("N")
                .atchPsbltyFileQty(1)
                .atchPsbltyFileSz(100L)
                .tmpltId("TMPLT_001")
                .useYn("Y")
                .ansYn("Y")
                .stsfdgYn("N")
                .build();
        when(boardMasterRepository.findById("BBSMSTR_000000000001")).thenReturn(Optional.of(entity));

        BoardMasterDto dto = new BoardMasterDto();
        dto.setBbsId("BBSMSTR_000000000001");
        // 전부 null인 상태로 update
        boardMasterService.updateBoardMaster("user01", dto);

        // 엔티티 값이 보존되는지 확인 — 부분수정(PATCH) 의미이므로 미전송 필드는 전부 유지돼야 한다.
        // 한 필드라도 단언에서 빠지면 해당 null-병합 가드가 사라져도 테스트가 통과해 버린다.
        assertThat(entity.getBbsTtl()).isEqualTo("Old Title");
        assertThat(entity.getBbsExpln()).isEqualTo("Old Expln");
        assertThat(entity.getAnsPsbltyYn()).isEqualTo("N");
        assertThat(entity.getFileAtchPsbltyYn()).isEqualTo("N");
        assertThat(entity.getAtchPsbltyFileQty()).isEqualTo(1);
        assertThat(entity.getAtchPsbltyFileSz()).isEqualTo(100L);
        assertThat(entity.getTmpltId()).isEqualTo("TMPLT_001");
        assertThat(entity.getUseYn()).isEqualTo("Y");
        assertThat(entity.getAnsYn()).isEqualTo("Y");
        assertThat(entity.getStsfdgYn()).isEqualTo("N");
        // 수정자 기록은 누가 고쳤는지에 대한 유일한 증적이다.
        assertThat(entity.getLastMdfrId()).isEqualTo("user01");
    }

    @Test
    @DisplayName("게시판 수정 - DTO 에 담긴 값은 기존 값을 덮어쓴다")
    void updateBoardMaster_appliesProvidedValues() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000001")
                .bbsTtl("Old Title")
                .bbsExpln("Old Expln")
                .ansPsbltyYn("N")
                .fileAtchPsbltyYn("N")
                .atchPsbltyFileQty(1)
                .atchPsbltyFileSz(100L)
                .tmpltId("TMPLT_001")
                .useYn("Y")
                .ansYn("N")
                .stsfdgYn("N")
                .build();
        when(boardMasterRepository.findById("BBSMSTR_000000000001")).thenReturn(Optional.of(entity));

        BoardMasterDto dto = new BoardMasterDto();
        dto.setBbsId("BBSMSTR_000000000001");
        dto.setBbsTtl("New Title");
        dto.setBbsExpln("New Expln");
        dto.setAnsPsbltyYn("Y");
        dto.setFileAtchPsbltyYn("Y");
        dto.setAtchPsbltyFileQty(5);
        dto.setAtchPsbltyFileSz(999L);
        dto.setTmpltId("TMPLT_002");
        dto.setUseYn("N");
        dto.setAnsYn("Y");
        dto.setStsfdgYn("Y");

        boardMasterService.updateBoardMaster("user02", dto);

        assertThat(entity.getBbsTtl()).isEqualTo("New Title");
        assertThat(entity.getBbsExpln()).isEqualTo("New Expln");
        assertThat(entity.getAnsPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getFileAtchPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getAtchPsbltyFileQty()).isEqualTo(5);
        assertThat(entity.getAtchPsbltyFileSz()).isEqualTo(999L);
        assertThat(entity.getTmpltId()).isEqualTo("TMPLT_002");
        assertThat(entity.getUseYn()).isEqualTo("N");
        assertThat(entity.getAnsYn()).isEqualTo("Y");
        assertThat(entity.getStsfdgYn()).isEqualTo("Y");
        assertThat(entity.getLastMdfrId()).isEqualTo("user02");
    }

    @Test
    @DisplayName("게시판 생성 - bbsId가 이미 있는 경우")
    void createBoardMaster_WithId() {
        BoardMasterDto dto = new BoardMasterDto();
        dto.setBbsId("CUSTOM_BBS_ID");
        boardMasterService.createBoardMaster("user01", dto);
        verify(entityManager).persist(any(BoardMaster.class));
    }

    @Test
    @DisplayName("게시판 생성 - bbsId 가 비어 있으면 표준 접두사로 채번한다")
    void createBoardMaster_generatesIdWhenBlank() {
        given(boardMasterRepository.existsById(anyString())).willReturn(false);

        BoardMasterDto dto = new BoardMasterDto();
        dto.setBbsId(""); // 빈 문자열도 null 과 동일하게 채번 대상이다
        dto.setAnsYn("Y");
        dto.setStsfdgYn("Y");

        String bbsId = boardMasterService.createBoardMaster("user01", dto);

        org.mockito.ArgumentCaptor<BoardMaster> captor = org.mockito.ArgumentCaptor.forClass(BoardMaster.class);
        verify(entityManager).persist(captor.capture());
        BoardMaster persisted = captor.getValue();

        assertThat(bbsId).isNotEmpty().startsWith("BBSMSTR_");
        assertThat(persisted.getBbsId()).isEqualTo(bbsId);
        // registerOption 이 빠지면 옵션 행이 없어 답변/만족도 설정이 통째로 유실된다.
        assertThat(persisted.getOption()).isNotNull();
        assertThat(persisted.getOption().getAnsYn()).isEqualTo("Y");
        assertThat(persisted.getOption().getStsfdgYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("게시판 목록 조회 - 검색 조건/키워드가 리포지토리까지 전달된다")
    void getBoardMasterList_passesSearchConditionThrough() {
        org.mockito.ArgumentCaptor<BoardMasterSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardMasterSearchCondition.class);
        given(boardMasterRepository.searchBoardMasters(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<BoardMasterSearchResult>(List.of()));

        boardMasterService.getBoardMasterList("1", "공지", Pageable.ofSize(10));

        // 조건 전달이 끊기면 검색어를 무시한 전체 목록이 조용히 반환된다.
        assertThat(captor.getValue().getSearchCnd()).isEqualTo("1");
        assertThat(captor.getValue().getSearchWrd()).isEqualTo("공지");
    }

    @Test
    @DisplayName("게시판 목록 조회(비페이징 오버로드) - 페이지 내용을 그대로 돌려준다")
    void getBoardMasterList_unpagedOverloadReturnsContent() {
        given(boardMasterRepository.searchBoardMasters(any(BoardMasterSearchCondition.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(mockSearchResult("BBS_01", "공지사항"))));

        List<BoardMasterDto> result = boardMasterService.getBoardMasterList("1", "공지");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBbsTtl()).isEqualTo("공지사항");
    }

    @Test
    @DisplayName("물리삭제 가능 여부 확인 - 성공 (Soft-deleted & No Articles)")
    void isDeletable_Success() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.countAllByBbsId("BBS_01")).willReturn(0L);

        boolean result = boardMasterService.isDeletable("BBS_01");

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("물리삭제 가능 여부 확인 - 실패 (Active Board)")
    void isDeletable_ActiveBoard() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        boolean result = boardMasterService.isDeletable("BBS_01");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("물리삭제 가능 여부 확인 - 실패 (Has Articles)")
    void isDeletable_HasArticles() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.countAllByBbsId("BBS_01")).willReturn(5L);

        boolean result = boardMasterService.isDeletable("BBS_01");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("물리삭제 실행 - 성공")
    void deleteBoardMasterPhysically_Success() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.countAllByBbsId("BBS_01")).willReturn(0L);

        boardMasterService.deleteBoardMasterPhysically("user1", "BBS_01");

        verify(boardMasterRepository).deleteById("BBS_01");
    }

    @Test
    @DisplayName("물리삭제 실행 - 실패 (Active Board)")
    void deleteBoardMasterPhysically_ActiveBoard() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        assertThrows(BusinessException.class, 
            () -> boardMasterService.deleteBoardMasterPhysically("user1", "BBS_01"));
    }

    @Test
    @DisplayName("물리삭제 실행 - 실패 (Has Articles)")
    void deleteBoardMasterPhysically_HasArticles() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.countAllByBbsId("BBS_01")).willReturn(3L);

        assertThrows(BusinessException.class, 
            () -> boardMasterService.deleteBoardMasterPhysically("user1", "BBS_01"));
    }

    @Test
    @DisplayName("일괄 상태 변경 - 마스터를 한 번에 조회해 모두 변경한다")
    void updateBoardMasterStatusInBatch_usesSingleBatchLookup() {
        BoardMaster master1 = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        BoardMaster master2 = BoardMaster.builder().bbsId("BBS_02").useYn("Y").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of(master2, master1));

        boardMasterService.updateBoardMasterStatusInBatch("user1", List.of("BBS_01", "BBS_02"), "N");

        assertThat(master1.getUseYn()).isEqualTo("N");
        assertThat(master2.getUseYn()).isEqualTo("N");
        verify(boardMasterRepository).findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_02"));
        verify(boardMasterRepository, never()).findById(anyString());
    }

    @Test
    @DisplayName("일괄 상태 변경 - 중복 ID는 한 번만 처리한다")
    void updateBoardMasterStatusInBatch_deduplicatesIds() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01")))
                .willReturn(List.of(master));

        boardMasterService.updateBoardMasterStatusInBatch("user1", List.of("BBS_01", "BBS_01"), "N");

        assertThat(master.getUseYn()).isEqualTo("N");
        verify(boardMasterRepository).findAllWithOptionByBbsIdIn(List.of("BBS_01"));
    }

    @Test
    @DisplayName("일괄 상태 변경 - 누락 ID가 있으면 조회된 엔티티도 변경하지 않는다")
    void updateBoardMasterStatusInBatch_missingIdDoesNotPartiallyMutate() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_MISSING")))
                .willReturn(List.of(master));

        assertThrows(BusinessException.class,
                () -> boardMasterService.updateBoardMasterStatusInBatch(
                        "user1", List.of("BBS_01", "BBS_MISSING"), "N"));

        assertThat(master.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("일괄 물리 삭제 - 마스터와 게시글 존재를 각각 한 번 조회하고 안전한 삭제 경로를 한 번 호출한다")
    void deleteBoardMastersInBatch_usesSingleBatchQueriesAndDelete() {
        BoardMaster master1 = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        BoardMaster master2 = BoardMaster.builder().bbsId("BBS_02").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of(master2, master1));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of());

        boardMasterService.deleteBoardMastersInBatch("user1", List.of("BBS_01", "BBS_02"));

        verify(boardMasterRepository).findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_02"));
        verify(boardRepository).findBbsIdsHavingAnyArticles(List.of("BBS_01", "BBS_02"));
        verify(boardMasterRepository).deleteAll(List.of(master1, master2));
        verify(boardMasterRepository, never()).findById(anyString());
        verify(boardRepository, never()).countAllByBbsId(anyString());
        verify(boardMasterRepository, never()).delete(any(BoardMaster.class));
    }

    @Test
    @DisplayName("일괄 물리 삭제 - 중복 ID는 검증과 삭제 모두 한 번만 수행한다")
    void deleteBoardMastersInBatch_deduplicatesIds() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01")))
                .willReturn(List.of(master));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01"))).willReturn(List.of());

        boardMasterService.deleteBoardMastersInBatch("user1", List.of("BBS_01", "BBS_01"));

        verify(boardMasterRepository).deleteAll(List.of(master));
    }

    @Test
    @DisplayName("일괄 물리 삭제 - 활성 게시판이 하나라도 있으면 어느 대상도 삭제하지 않는다")
    void deleteBoardMastersInBatch_activeBoardDoesNotPartiallyDelete() {
        BoardMaster master1 = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        BoardMaster master2 = BoardMaster.builder().bbsId("BBS_02").useYn("Y").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of(master1, master2));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of());

        assertThrows(BusinessException.class,
            () -> boardMasterService.deleteBoardMastersInBatch("user1", List.of("BBS_01", "BBS_02")));

        verify(boardMasterRepository, never()).deleteAll(anyList());
        verify(boardMasterRepository, never()).delete(any(BoardMaster.class));
    }

    @Test
    @DisplayName("일괄 물리 삭제 - 게시글 보유 게시판이 하나라도 있으면 어느 대상도 삭제하지 않는다")
    void deleteBoardMastersInBatch_articlesDoNotPartiallyDelete() {
        BoardMaster master1 = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        BoardMaster master2 = BoardMaster.builder().bbsId("BBS_02").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of(master1, master2));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01", "BBS_02")))
                .willReturn(List.of("BBS_02"));

        assertThrows(BusinessException.class,
            () -> boardMasterService.deleteBoardMastersInBatch("user1", List.of("BBS_01", "BBS_02")));

        verify(boardMasterRepository, never()).deleteAll(anyList());
        verify(boardMasterRepository, never()).delete(any(BoardMaster.class));
    }

    @Test
    @DisplayName("일괄 물리 삭제 - 누락 ID가 있으면 게시글 조회나 삭제를 시작하지 않는다")
    void deleteBoardMastersInBatch_missingIdDoesNotStartDelete() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBS_MISSING")))
                .willReturn(List.of(master));

        assertThrows(BusinessException.class,
                () -> boardMasterService.deleteBoardMastersInBatch(
                        "user1", List.of("BBS_01", "BBS_MISSING")));

        verify(boardRepository, never()).findBbsIdsHavingAnyArticles(anyList());
        verify(boardMasterRepository, never()).deleteAll(anyList());
    }
}
