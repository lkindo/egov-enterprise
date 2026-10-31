package nuri.business.service.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.board.*;
import nuri.business.core.config.BoardIdProperties;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterMapper;
import nuri.business.service.board.dto.BoardMasterMapperImpl;
import nuri.business.service.board.dto.BoardMasterUpdateRequest;
import nuri.foundation.core.exception.CommonErrorCode;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("BoardMasterService 단위 테스트")
class BoardMasterServiceTest {

    /** 쓰기 서비스는 현재 권한을 다시 본다(백엔드 헌법 제8조). 권한을 따로 쥐지 않은 시험은 관리자로 돈다. */
    @org.junit.jupiter.api.BeforeEach
    void authorizeServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
    }

    @org.junit.jupiter.api.AfterEach
    void clearServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

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

    // [2026-10-23 ADR-0040 결정 9] 무엇을 넘기는지는 여기서, 같은 값을 거르는 규칙은 BoardChangeRecorderTest 가 본다.
    @Mock
    private BoardChangeRecorder changeRecorder;

    // 기본 설정: 공지·FAQ = AAAA, 업무 = CCCC.
    @Spy
    private BoardIdProperties boardIdProperties = new BoardIdProperties();

    // [2026-10-23 ADR-0040 결정 9] 영구 삭제의 대상 게시판을 민감 작업 원장에 남긴다.
    @Mock
    private nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;

    private static final BoardChangeRecorder.ChangeType SETTING = BoardChangeRecorder.ChangeType.SETTING;
    private static final BoardChangeRecorder.ChangeType USE = BoardChangeRecorder.ChangeType.USE;

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

        Page<BoardMasterDto> result = boardMasterService.getBoardMasterList("Test", null, pageable);

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
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")).thenReturn(true);
            BoardMasterDto dto = BoardMasterDto.builder().bbsTtl("New Board").build();

            String bbsId = boardMasterService.createBoardMaster("user1", dto);

            assertThat(bbsId).startsWith("BBSMSTR_");
            // [2026-10-23 ADR-0040 결정 3·6] 예약 게시를 보내지 않으면 받지 않음(N)으로 만든다.
            //   [결정 5·6] 상단 고정 정책도 보내지 않으면 고정 안 받음·5건·30일이다(마이그레이션 기본값과 같다).
            //   [결정 6·7] 비밀글 정책·추천 받기도 보내지 않으면 NONE·받음이다(지금 동작).
            verify(entityManager).persist(argThat((BoardMaster bm) -> "N".equals(bm.getRsvtPstgPsbltyYn())
                    && "N".equals(bm.getUpendFixPsbltyYn())
                    && java.math.BigInteger.valueOf(5).equals(bm.getUpendFixUplmtNocs())
                    && java.math.BigInteger.valueOf(30).equals(bm.getUpendFixBscDayCnt())
                    && "NONE".equals(bm.getPrvtPstPlcyCd()) && "Y".equals(bm.getRcmdtnUseYn())));
        }
    }

    @Test
    @DisplayName("[ADR-0040 결정 6·7] 게시판 생성은 보낸 비밀글 정책·추천 받기를 그대로 만든다")
    void createBoardMaster_appliesPostPolicies() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")).thenReturn(true);
            BoardMasterDto dto = BoardMasterDto.builder().bbsTtl("질의응답").prvtPstPlcyCd("OPTIONAL").rcmdtnUseYn("N").build();

            boardMasterService.createBoardMaster("user1", dto);

            verify(entityManager).persist(argThat((BoardMaster bm) -> "OPTIONAL".equals(bm.getPrvtPstPlcyCd())
                    && "N".equals(bm.getRcmdtnUseYn())));
        }
    }

    @Test
    @DisplayName("[ADR-0040 결정 6·7] 비밀글 정책·추천 받기를 보내지 않거나 같은 값이면 저장값·수정자·이력이 그대로다")
    void updateBoardMaster_postPoliciesKeepStoredValuesWhenAbsentOrSame() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000007").bbsTtl("문의").fileAtchPsbltyYn("N").atchPsbltyFileQty(0)
                .useYn("Y").ansYn("Y").stsfdgYn("Y").prvtPstPlcyCd("REQUIRED").rcmdtnUseYn("N").build();
        ReflectionTestUtils.setField(entity, "version", 3);
        entity.setLastMdfrId("previous");
        when(boardMasterRepository.findById("BBSMSTR_000000000007")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest absent = new BoardMasterUpdateRequest();
        absent.setUseYn("Y");
        absent.setVersion(3);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000007", absent);
        BoardMasterUpdateRequest same = new BoardMasterUpdateRequest();
        same.setUseYn("Y");
        same.setPrvtPstPlcyCd("REQUIRED");
        same.setRcmdtnUseYn("N");
        same.setVersion(3);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000007", same);

        assertThat(entity.getPrvtPstPlcyCd()).isEqualTo("REQUIRED");
        assertThat(entity.getRcmdtnUseYn()).isEqualTo("N");
        assertThat(entity.getLastMdfrId()).as("바뀐 값이 없으면 수정자도 쓰지 않는다(버전이 오르지 않는다)").isEqualTo("previous");
        // 기록기는 항목마다 불리지만 전후 값이 같아 아무것도 남기지 않는다(BoardChangeRecorderTest).
        verify(changeRecorder, times(2)).recordBoard("BBSMSTR_000000000007", SETTING, "비밀글 정책", "REQUIRED", "REQUIRED");
        verify(changeRecorder, times(2)).recordBoard("BBSMSTR_000000000007", SETTING, "추천 받기", "N", "N");
    }

    @Test
    @DisplayName("[ADR-0040 결정 6·7·10] 읽은 버전이 다르면 비밀글 정책·추천 받기도 덮지 않는다")
    void updateBoardMaster_staleVersionDoesNotOverwritePostPolicies() {
        BoardMaster entity = BoardMaster.builder().bbsId("BBS_02").bbsTtl("Current").useYn("Y").build();
        ReflectionTestUtils.setField(entity, "version", 5);
        given(boardMasterRepository.findById("BBS_02")).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> boardMasterService.updateBoardMaster("user1", "BBS_02",
                BoardMasterUpdateRequest.builder().bbsTtl("Current").useYn("Y").prvtPstPlcyCd("REQUIRED")
                        .rcmdtnUseYn("N").version(4).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(entity.getPrvtPstPlcyCd()).isEqualTo("NONE");
        assertThat(entity.getRcmdtnUseYn()).isEqualTo("Y");
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("게시판 마스터 수정")
    void updateBoardMaster() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")).thenReturn(true);
            BoardMaster master = BoardMaster.builder().bbsId("BBS_01").bbsTtl("Old Board").build();
            ReflectionTestUtils.setField(master, "version", 0);
            given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

            BoardMasterUpdateRequest request = BoardMasterUpdateRequest.builder().bbsTtl("Updated Board").version(0).build();
            boardMasterService.updateBoardMaster("user1", "BBS_01", request);

            assertThat(master.getBbsTtl()).isEqualTo("Updated Board");
            verify(changeRecorder).recordBoard("BBS_01", SETTING, "게시판 명칭", "Old Board", "Updated Board");
        }
    }

    @Test
    @DisplayName("게시판 마스터 삭제 (논리삭제)")
    void deleteBoardMaster() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")).thenReturn(true);
            BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
            given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

            boardMasterService.deleteBoardMaster("user1", "BBS_01");

            verify(boardMasterRepository).findById("BBS_01");
            assertThat(master.getUseYn()).isEqualTo("N");
            // [2026-10-23 ADR-0040 결정 9] 단건 비활성화도 사용 여부 변경으로 남긴다.
            verify(changeRecorder).recordBoard("BBS_01", USE, "게시판 사용", "Y", "N");
        }
    }

    @Test
    @DisplayName("옵션 필드(댓글, 만족도)가 포함된 게시판 마스터 생성")
    void createBoardMaster_WithOptionalFields() throws Exception {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BBS_MST_READ_ALL")).thenReturn(true);
            BoardMasterDto dto = BoardMasterDto.builder()
                    .bbsTtl("Full Board")
                    .ansYn("Y")
                    .stsfdgYn("Y")
                    .rsvtPstgPsbltyYn("Y")
                    .upendFixPsbltyYn("Y")
                    .upendFixUplmtNocs(3)
                    .upendFixBscDayCnt(14)
                    .build();

            boardMasterService.createBoardMaster("user1", dto);

            verify(entityManager).persist(argThat((BoardMaster bm) ->
                "Y".equals(bm.getAnsYn()) && "Y".equals(bm.getStsfdgYn()) && "Y".equals(bm.getRsvtPstgPsbltyYn())
                && "Y".equals(bm.getUpendFixPsbltyYn())
                && java.math.BigInteger.valueOf(3).equals(bm.getUpendFixUplmtNocs())
                && java.math.BigInteger.valueOf(14).equals(bm.getUpendFixBscDayCnt())
            ));
        }
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
                .rsvtPstgPsbltyYn("Y")
                .build();
        ReflectionTestUtils.setField(entity, "version", 3);
        entity.setLastMdfrId("previous");
        when(boardMasterRepository.findById("BBSMSTR_000000000001")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest request = new BoardMasterUpdateRequest();
        request.setVersion(3);
        // 버전 말고 전부 null인 상태로 update
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000001", request);

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
        assertThat(entity.getRsvtPstgPsbltyYn()).as("보내지 않은 예약 게시 설정은 그대로다").isEqualTo("Y");
        // [2026-10-23 ADR-0040 결정 10] 바뀐 값이 없으면 수정자도 그대로다 — 수정자만 바뀌어도 버전이 올라 다른 운영자가 409 를 받는다.
        //   실제 변경의 수정자 기록은 appliesProvidedValues 가 본다.
        assertThat(entity.getLastMdfrId()).isEqualTo("previous");
        // 기록기에는 같은 값만 넘어간다(같은 값은 기록기가 거른다).
        verify(changeRecorder).recordBoard("BBSMSTR_000000000001", SETTING, "게시판 명칭", "Old Title", "Old Title");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000001", USE, "게시판 사용", "Y", "Y");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000001", SETTING, "예약 게시", "Y", "Y");
        // [ADR-0040 결정 5·6] 보내지 않은 상단 고정 정책도 그대로다.
        verify(changeRecorder).recordBoard("BBSMSTR_000000000001", SETTING, "상단 고정 허용", "N", "N");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000001", SETTING, "상단 고정 상한",
                java.math.BigInteger.valueOf(5), java.math.BigInteger.valueOf(5));
        verify(changeRecorder).recordBoard("BBSMSTR_000000000001", SETTING, "상단 고정 기본 일수",
                java.math.BigInteger.valueOf(30), java.math.BigInteger.valueOf(30));
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9] 게시판 수정 - 비어 있는 옛 값과 뜻이 같은 '' · 0 · N 은 저장값을 바꾸거나 이력에 남기지 않는다")
    void updateBoardMaster_keepsNullWhenRequestMeansTheSame() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000002").bbsTtl("시드 게시판").bbsExpln(null)
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).atchPsbltyFileSz(null)
                .tmpltId("TMPLT_001").useYn("Y").ansYn("Y").stsfdgYn("Y").build();
        ReflectionTestUtils.setField(entity, "ansPsbltyYn", null);
        ReflectionTestUtils.setField(entity, "version", 2);
        entity.setLastMdfrId("previous");
        when(boardMasterRepository.findById("BBSMSTR_000000000002")).thenReturn(Optional.of(entity));

        // 설정 탭이 운영자가 건드리지 않은 칸까지 정규화해 보내는 모양 그대로다.
        BoardMasterUpdateRequest request = new BoardMasterUpdateRequest();
        request.setBbsTtl("시드 게시판");
        request.setBbsExpln("");
        request.setAnsPsbltyYn("N");
        request.setFileAtchPsbltyYn("Y");
        request.setAtchPsbltyFileQty(3);
        request.setAtchPsbltyFileSz(0L);
        request.setUseYn("Y");
        request.setAnsYn("Y");
        request.setStsfdgYn("Y");
        request.setVersion(2);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000002", request);

        assertThat(entity.getBbsExpln()).isNull();
        assertThat(entity.getAnsPsbltyYn()).isNull();
        assertThat(entity.getAtchPsbltyFileSz()).isNull();
        assertThat(entity.getLastMdfrId()).isEqualTo("previous");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000002", SETTING, "게시판 소개", null, null);
        verify(changeRecorder).recordBoard("BBSMSTR_000000000002", SETTING, "답글 허용", null, null);
        verify(changeRecorder).recordBoard("BBSMSTR_000000000002", SETTING, "파일당 크기(바이트)", null, null);
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9] 게시판 수정 - 비어 있는 옛 값도 뜻이 다른 요청값이면 바꾸고 이력에 남긴다")
    void updateBoardMaster_replacesNullWhenRequestMeansSomethingElse() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000003").bbsTtl("시드 게시판").bbsExpln(null)
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).atchPsbltyFileSz(null)
                .tmpltId("TMPLT_001").useYn("Y").ansYn("Y").stsfdgYn("Y").build();
        ReflectionTestUtils.setField(entity, "ansPsbltyYn", null);
        ReflectionTestUtils.setField(entity, "version", 2);
        when(boardMasterRepository.findById("BBSMSTR_000000000003")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest request = new BoardMasterUpdateRequest();
        request.setBbsExpln("새 소개");
        request.setAnsPsbltyYn("Y");
        request.setAtchPsbltyFileSz(1_048_576L);
        request.setUseYn("Y");
        request.setVersion(2);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000003", request);

        assertThat(entity.getBbsExpln()).isEqualTo("새 소개");
        assertThat(entity.getAnsPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getAtchPsbltyFileSz()).isEqualTo(1_048_576L);
        assertThat(entity.getLastMdfrId()).isEqualTo("user01");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000003", SETTING, "게시판 소개", null, "새 소개");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000003", SETTING, "답글 허용", null, "Y");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000003", SETTING, "파일당 크기(바이트)", null, 1_048_576L);
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9] 게시판 수정 - 앞뒤 공백만 다른 명칭·소개는 저장값을 그대로 두고 이력에 남기지 않는다")
    void updateBoardMaster_keepsValuesThatDifferOnlyInSurroundingSpaces() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000004").bbsTtl("공지사항 ").bbsExpln(" 사내 공지 ")
                .fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).atchPsbltyFileSz(1_048_576L)
                .tmpltId("TMPLT_001").useYn("Y").ansYn("Y").stsfdgYn("Y").build();
        ReflectionTestUtils.setField(entity, "version", 1);
        entity.setLastMdfrId("previous");
        when(boardMasterRepository.findById("BBSMSTR_000000000004")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest request = new BoardMasterUpdateRequest();
        request.setBbsTtl("공지사항");
        request.setBbsExpln("사내 공지");
        request.setUseYn("Y");
        request.setVersion(1);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000004", request);

        assertThat(entity.getBbsTtl()).isEqualTo("공지사항 ");
        assertThat(entity.getBbsExpln()).isEqualTo(" 사내 공지 ");
        assertThat(entity.getLastMdfrId()).isEqualTo("previous");
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9] 게시판 수정 - 값이 있던 항목을 빈 뜻(크기 0·빈 소개·답글 N)으로 바꾸면 그대로 바꾸고 이력에 남긴다")
    void updateBoardMaster_appliesChangeToEmptyMeaning() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000005").bbsTtl("자료실").bbsExpln("자료를 올립니다")
                .ansPsbltyYn("Y").fileAtchPsbltyYn("Y").atchPsbltyFileQty(3).atchPsbltyFileSz(5_242_880L)
                .tmpltId("TMPLT_001").useYn("Y").ansYn("Y").stsfdgYn("Y").build();
        ReflectionTestUtils.setField(entity, "version", 6);
        when(boardMasterRepository.findById("BBSMSTR_000000000005")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest request = new BoardMasterUpdateRequest();
        request.setBbsExpln("");
        request.setAnsPsbltyYn("N");
        request.setAtchPsbltyFileSz(0L);
        request.setUseYn("Y");
        request.setVersion(6);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000005", request);

        assertThat(entity.getBbsExpln()).isEmpty();
        assertThat(entity.getAnsPsbltyYn()).isEqualTo("N");
        assertThat(entity.getAtchPsbltyFileSz()).isZero();
        assertThat(entity.getLastMdfrId()).isEqualTo("user01");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000005", SETTING, "게시판 소개", "자료를 올립니다", "");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000005", SETTING, "답글 허용", "Y", "N");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000005", SETTING, "파일당 크기(바이트)", 5_242_880L, 0L);
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
        ReflectionTestUtils.setField(entity, "version", 0);
        when(boardMasterRepository.findById("BBSMSTR_000000000001")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest request = new BoardMasterUpdateRequest();
        request.setBbsTtl("New Title");
        request.setBbsExpln("New Expln");
        request.setAnsPsbltyYn("Y");
        request.setFileAtchPsbltyYn("Y");
        request.setAtchPsbltyFileQty(5);
        request.setAtchPsbltyFileSz(999L);
        request.setUseYn("N");
        request.setAnsYn("Y");
        request.setStsfdgYn("Y");
        request.setRsvtPstgPsbltyYn("Y");
        request.setUpendFixPsbltyYn("Y");
        request.setUpendFixUplmtNocs(7);
        request.setUpendFixBscDayCnt(14);
        request.setPrvtPstPlcyCd("REQUIRED");
        request.setRcmdtnUseYn("N");
        request.setVersion(0);

        boardMasterService.updateBoardMaster("user02", "BBSMSTR_000000000001", request);

        assertThat(entity.getBbsTtl()).isEqualTo("New Title");
        assertThat(entity.getBbsExpln()).isEqualTo("New Expln");
        assertThat(entity.getAnsPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getFileAtchPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getAtchPsbltyFileQty()).isEqualTo(5);
        assertThat(entity.getAtchPsbltyFileSz()).isEqualTo(999L);
        // [2026-10-23 ADR-0040 §5.5] 템플릿은 만든 뒤 바꾸지 않는다 — 수정 요청에 필드가 없다.
        assertThat(entity.getTmpltId()).isEqualTo("TMPLT_001");
        assertThat(entity.getUseYn()).isEqualTo("N");
        assertThat(entity.getAnsYn()).isEqualTo("Y");
        assertThat(entity.getStsfdgYn()).isEqualTo("Y");
        // [2026-10-23 ADR-0040 결정 3·6] 예약 게시 설정(기존 게시판 기본값 N).
        assertThat(entity.getRsvtPstgPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getLastMdfrId()).isEqualTo("user02");
        // [2026-10-23 ADR-0040 결정 9] 바뀐 항목마다 전후 값을 기록기에 넘긴다. 사용 여부는 USE 다.
        String id = "BBSMSTR_000000000001";
        verify(changeRecorder).recordBoard(id, SETTING, "게시판 명칭", "Old Title", "New Title");
        verify(changeRecorder).recordBoard(id, SETTING, "게시판 소개", "Old Expln", "New Expln");
        verify(changeRecorder).recordBoard(id, SETTING, "답글 허용", "N", "Y");
        verify(changeRecorder).recordBoard(id, SETTING, "댓글 받기", "N", "Y");
        verify(changeRecorder).recordBoard(id, SETTING, "만족도 평가 받기", "N", "Y");
        verify(changeRecorder).recordBoard(id, SETTING, "파일 첨부 허용", "N", "Y");
        verify(changeRecorder).recordBoard(id, SETTING, "첨부 파일 수", 1, 5);
        verify(changeRecorder).recordBoard(id, SETTING, "파일당 크기(바이트)", 100L, 999L);
        verify(changeRecorder).recordBoard(id, USE, "게시판 사용", "Y", "N");
        verify(changeRecorder).recordBoard(id, SETTING, "예약 게시", "N", "Y");
        // [ADR-0040 결정 5·6] 상단 고정 정책(기존 게시판 기본값 N·5·30).
        assertThat(entity.getUpendFixPsbltyYn()).isEqualTo("Y");
        assertThat(entity.getUpendFixUplmtNocs()).isEqualTo(java.math.BigInteger.valueOf(7));
        assertThat(entity.getUpendFixBscDayCnt()).isEqualTo(java.math.BigInteger.valueOf(14));
        verify(changeRecorder).recordBoard(id, SETTING, "상단 고정 허용", "N", "Y");
        verify(changeRecorder).recordBoard(id, SETTING, "상단 고정 상한",
                java.math.BigInteger.valueOf(5), java.math.BigInteger.valueOf(7));
        verify(changeRecorder).recordBoard(id, SETTING, "상단 고정 기본 일수",
                java.math.BigInteger.valueOf(30), java.math.BigInteger.valueOf(14));
        // [ADR-0040 결정 6·7] 비밀글 정책·추천 받기(기존 게시판 기본값 NONE·Y).
        assertThat(entity.getPrvtPstPlcyCd()).isEqualTo("REQUIRED");
        assertThat(entity.getRcmdtnUseYn()).isEqualTo("N");
        verify(changeRecorder).recordBoard(id, SETTING, "비밀글 정책", "NONE", "REQUIRED");
        verify(changeRecorder).recordBoard(id, SETTING, "추천 받기", "Y", "N");
        verifyNoMoreInteractions(changeRecorder);
    }

    @Test
    @DisplayName("[ADR-0040 결정 5·6] 상단 고정 정책을 같은 값으로 다시 보내면 저장값·수정자를 그대로 두고, 설정을 꺼도 정책 값만 바뀐다")
    void updateBoardMaster_pinPolicyKeepsSameValuesAndChangesOnlyPolicy() {
        BoardMaster entity = BoardMaster.builder()
                .bbsId("BBSMSTR_000000000006").bbsTtl("공지").fileAtchPsbltyYn("N").atchPsbltyFileQty(0)
                .useYn("Y").ansYn("Y").stsfdgYn("Y")
                .upendFixPsbltyYn("Y").upendFixUplmtNocs(java.math.BigInteger.valueOf(5))
                .upendFixBscDayCnt(java.math.BigInteger.valueOf(30)).build();
        ReflectionTestUtils.setField(entity, "version", 4);
        entity.setLastMdfrId("previous");
        java.math.BigInteger storedLimit = entity.getUpendFixUplmtNocs();
        when(boardMasterRepository.findById("BBSMSTR_000000000006")).thenReturn(Optional.of(entity));

        BoardMasterUpdateRequest same = new BoardMasterUpdateRequest();
        same.setUseYn("Y");
        same.setUpendFixPsbltyYn("Y");
        same.setUpendFixUplmtNocs(5);
        same.setUpendFixBscDayCnt(30);
        same.setVersion(4);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000006", same);

        assertThat(entity.getUpendFixUplmtNocs()).as("같은 뜻이면 저장값 객체를 그대로 둔다").isSameAs(storedLimit);
        assertThat(entity.getLastMdfrId()).isEqualTo("previous");

        BoardMasterUpdateRequest off = new BoardMasterUpdateRequest();
        off.setUseYn("Y");
        off.setUpendFixPsbltyYn("N");
        off.setVersion(4);
        boardMasterService.updateBoardMaster("user01", "BBSMSTR_000000000006", off);

        assertThat(entity.getUpendFixPsbltyYn()).isEqualTo("N");
        assertThat(entity.getUpendFixUplmtNocs()).as("보내지 않은 상한은 그대로").isEqualTo(java.math.BigInteger.valueOf(5));
        assertThat(entity.getUpendFixBscDayCnt()).isEqualTo(java.math.BigInteger.valueOf(30));
        assertThat(entity.getLastMdfrId()).isEqualTo("user01");
        verify(changeRecorder).recordBoard("BBSMSTR_000000000006", SETTING, "상단 고정 허용", "Y", "N");
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 10] 게시판 수정 - 읽은 버전이 다르면 409 이고 덮어쓰거나 기록하지 않는다, 버전이 없으면 400 이다")
    void updateBoardMaster_rejectsStaleOrMissingVersion() {
        BoardMaster entity = BoardMaster.builder().bbsId("BBS_01").bbsTtl("Current").useYn("Y").build();
        ReflectionTestUtils.setField(entity, "version", 5);
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> boardMasterService.updateBoardMaster("user1", "BBS_01",
                BoardMasterUpdateRequest.builder().bbsTtl("Stale").useYn("N").version(4).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> boardMasterService.updateBoardMaster("user1", "BBS_01",
                BoardMasterUpdateRequest.builder().bbsTtl("No version").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(entity.getBbsTtl()).isEqualTo("Current");
        assertThat(entity.getUseYn()).isEqualTo("Y");
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9] 일괄 상태 변경은 게시판마다 사용 여부 전후 값을 기록기에 넘긴다")
    void updateBoardMasterStatusInBatch_recordsEachBoard() {
        BoardMaster active = BoardMaster.builder().bbsId("BBS_A").useYn("Y").build();
        BoardMaster inactive = BoardMaster.builder().bbsId("BBS_B").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_A", "BBS_B"))).willReturn(List.of(active, inactive));

        boardMasterService.updateBoardMasterStatusInBatch("user1", List.of("BBS_A", "BBS_B"), "N");

        assertThat(active.getUseYn()).isEqualTo("N");
        assertThat(active.getLastMdfrId()).isEqualTo("user1");
        assertThat(inactive.getLastMdfrId()).as("이미 그 상태인 게시판은 고치지 않는다").isNull();
        verify(changeRecorder).recordBoard("BBS_A", USE, "게시판 사용", "Y", "N");
        verify(changeRecorder).recordBoard("BBS_B", USE, "게시판 사용", "N", "N");
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9·10] 이미 사용 안 함인 게시판의 단건 비활성화는 아무것도 고치거나 남기지 않는다")
    void deleteBoardMaster_alreadyInactiveIsNoop() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        boardMasterService.deleteBoardMaster("user1", "BBS_01");

        assertThat(master.getLastMdfrId()).isNull();
        verifyNoInteractions(changeRecorder);
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 §5.2·2026-10-26 ADR-0043 결정 4] 지정 용도는 설정을 따라 공지·FAQ·업무·Q&A·위키 순서로 싣고, 같은 게시판이면 여럿이다")
    void designationsFollowConfiguredBoardIds() {
        assertThat(boardMasterService.designationsOf("BBSMSTR_AAAAAAAAAAAA")).containsExactly("NOTICE", "FAQ");
        assertThat(boardMasterService.designationsOf("BBSMSTR_CCCCCCCCCCCC")).containsExactly("TASK");
        // [ADR-0043 결정 4] 화면 상수와 같은 기본값으로 Q&A·위키도 서버가 안다.
        assertThat(boardMasterService.designationsOf("BBSMSTR_DDDDDDDDDDDD")).containsExactly("QNA");
        assertThat(boardMasterService.designationsOf("BBSMSTR_EEEEEEEEEEEE")).containsExactly("WIKI");
        assertThat(boardMasterService.designationsOf("BBSMSTR_ZZZZZZZZZZZZ")).isEmpty();

        boardIdProperties.setFaqId("BBSMSTR_FFFFFFFFFFFF");
        assertThat(boardMasterService.designationsOf("BBSMSTR_AAAAAAAAAAAA")).containsExactly("NOTICE");
        assertThat(boardMasterService.designationsOf("BBSMSTR_FFFFFFFFFFFF")).containsExactly("FAQ");

        boardIdProperties.setWikiId("BBSMSTR_DDDDDDDDDDDD");
        assertThat(boardMasterService.designationsOf("BBSMSTR_DDDDDDDDDDDD")).containsExactly("QNA", "WIKI");
        assertThat(boardMasterService.designationsOf("BBSMSTR_EEEEEEEEEEEE")).isEmpty();
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
    @DisplayName("게시판 목록 조회 - 검색어가 리포지토리까지 전달된다")
    void getBoardMasterList_passesSearchKeywordThrough() {
        org.mockito.ArgumentCaptor<BoardMasterSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardMasterSearchCondition.class);
        given(boardMasterRepository.searchBoardMasters(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<BoardMasterSearchResult>(List.of()));

        boardMasterService.getBoardMasterList("공지", null, Pageable.ofSize(10));

        // 검색어 전달이 끊기면 검색어를 무시한 전체 목록이 조용히 반환된다.
        assertThat(captor.getValue().getSearchWrd()).isEqualTo("공지");
        assertThat(captor.getValue().getUseYn()).as("사용 여부를 비우면 전체다").isNull();
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 §5.2] 게시판 목록 조회 - 사용 여부 Y·N 은 그 상태만, 그 밖의 값은 400 이다")
    void getBoardMasterList_filtersByUseYnOrRejects() {
        org.mockito.ArgumentCaptor<BoardMasterSearchCondition> captor =
                org.mockito.ArgumentCaptor.forClass(BoardMasterSearchCondition.class);
        given(boardMasterRepository.searchBoardMasters(captor.capture(), any(Pageable.class)))
                .willReturn(new PageImpl<BoardMasterSearchResult>(List.of()));

        boardMasterService.getBoardMasterList(null, "N", Pageable.ofSize(10));
        assertThat(captor.getValue().getUseYn()).isEqualTo("N");
        boardMasterService.getBoardMasterList(null, " ", Pageable.ofSize(10));
        assertThat(captor.getValue().getUseYn()).isNull();

        for (String invalid : List.of("y", "YES", "X")) {
            assertThatThrownBy(() -> boardMasterService.getBoardMasterList(null, invalid, Pageable.ofSize(10)))
                    .as(invalid)
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        verify(boardMasterRepository, times(2)).searchBoardMasters(any(), any(Pageable.class));
    }

    @Test
    @DisplayName("게시판 목록 조회(비페이징 오버로드) - 페이지 내용을 그대로 돌려준다")
    void getBoardMasterList_unpagedOverloadReturnsContent() {
        given(boardMasterRepository.searchBoardMasters(any(BoardMasterSearchCondition.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(mockSearchResult("BBS_01", "공지사항"))));

        List<BoardMasterDto> result = boardMasterService.getBoardMasterList("공지");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBbsTtl()).isEqualTo("공지사항");
    }

    @Test
    @DisplayName("물리삭제 가능 여부 확인 - 성공 (Soft-deleted & No Articles)")
    void isDeletable_Success() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01"))).willReturn(List.of());

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
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01"))).willReturn(List.of("BBS_01"));

        boolean result = boardMasterService.isDeletable("BBS_01");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("물리삭제 실행 - 성공")
    void deleteBoardMasterPhysically_Success() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01"))).willReturn(List.of());

        boardMasterService.deleteBoardMasterPhysically("user1", "BBS_01");

        verify(boardMasterRepository).deleteById("BBS_01");
        // 핸들러 표지는 누가·언제만 남긴다 — 무엇을 지웠는지는 같은 트랜잭션의 이 기록이 남긴다.
        verify(sensitiveAudit).recordMutation("BOARD_MASTER_PURGE", "BBS_01");
    }

    @Test
    @DisplayName("물리삭제 실행 - 실패 (Active Board)")
    void deleteBoardMasterPhysically_ActiveBoard() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        assertThrows(BusinessException.class, 
            () -> boardMasterService.deleteBoardMasterPhysically("user1", "BBS_01"));
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("물리삭제 실행 - 실패 (Has Articles)")
    void deleteBoardMasterPhysically_HasArticles() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01"))).willReturn(List.of("BBS_01"));

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
        verify(boardMasterRepository, never()).delete(any(BoardMaster.class));
        verify(sensitiveAudit).recordMutation("BOARD_MASTER_PURGE", "BBS_01");
        verify(sensitiveAudit).recordMutation("BOARD_MASTER_PURGE", "BBS_02");
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
        verifyNoInteractions(sensitiveAudit);
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

    // ── [2026-10-26 ADR-0043 결정 4] 지정 게시판 영구 삭제 거부 ─────────────────────────────

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "BBSMSTR_AAAAAAAAAAAA", "BBSMSTR_CCCCCCCCCCCC", "BBSMSTR_DDDDDDDDDDDD", "BBSMSTR_EEEEEEEEEEEE"})
    @DisplayName("[ADR-0043 결정 4] 지정 게시판은 사용 안 함이고 글이 없어도 단건 영구 삭제를 409 로 거부하고 지우거나 원장에 남기지 않는다")
    void deleteBoardMasterPhysically_rejectsDesignatedBoard(String bbsId) {
        BoardMaster master = BoardMaster.builder().bbsId(bbsId).bbsTtl("지정 게시판").useYn("N").build();
        given(boardMasterRepository.findById(bbsId)).willReturn(Optional.of(master));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of(bbsId))).willReturn(List.of());

        assertThatThrownBy(() -> boardMasterService.deleteBoardMasterPhysically("user1", bbsId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        nuri.business.domain.board.exception.BoardErrorCode.DESIGNATED_BOARD_NOT_PURGEABLE)
                .hasMessageContaining("[지정 게시판] 게시판은 앱이")
                .hasMessageContaining("영구 삭제할 수 없습니다");
        verify(boardMasterRepository, never()).deleteById(anyString());
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("[ADR-0043 결정 4] 거부 사유는 지정 용도를 사람말로 모두 싣는다 — 기본 설정의 공지 게시판은 공지와 FAQ 둘이다")
    void deleteBoardMasterPhysically_reasonNamesEveryDesignation() {
        BoardMaster master = BoardMaster.builder().bbsId("BBSMSTR_AAAAAAAAAAAA").bbsTtl("공지사항").useYn("N").build();
        given(boardMasterRepository.findById("BBSMSTR_AAAAAAAAAAAA")).willReturn(Optional.of(master));

        assertThatThrownBy(() -> boardMasterService.deleteBoardMasterPhysically("user1", "BBSMSTR_AAAAAAAAAAAA"))
                .hasMessage("[공지사항] 게시판은 앱이 공지사항(업무 홈 공지 카드), 자주 묻는 질문(공개 FAQ·도움말) 용도로 지정해 쓰고 "
                        + "있어 영구 삭제할 수 없습니다. 쓰지 않으려면 사용 안 함으로 두십시오.");
    }

    @Test
    @DisplayName("[ADR-0043 결정 4] 일괄 영구 삭제에 지정 게시판이 하나라도 섞이면 409 이고 어느 대상도 지우지 않는다")
    void deleteBoardMastersInBatch_rejectsWhenAnyTargetIsDesignated() {
        BoardMaster plain = BoardMaster.builder().bbsId("BBS_01").useYn("N").build();
        BoardMaster wiki = BoardMaster.builder().bbsId("BBSMSTR_EEEEEEEEEEEE").bbsTtl("일정 게시판").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBSMSTR_EEEEEEEEEEEE")))
                .willReturn(List.of(plain, wiki));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01", "BBSMSTR_EEEEEEEEEEEE"))).willReturn(List.of());

        assertThatThrownBy(() -> boardMasterService.deleteBoardMastersInBatch("user1", List.of("BBS_01", "BBSMSTR_EEEEEEEEEEEE")))
                .hasFieldOrPropertyWithValue("errorCode",
                        nuri.business.domain.board.exception.BoardErrorCode.DESIGNATED_BOARD_NOT_PURGEABLE)
                .hasMessageContaining("[일정 게시판]")
                .hasMessageContaining("위키(지식 허브 위키 탭)");
        verify(boardMasterRepository, never()).deleteAll(anyList());
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("[ADR-0043 결정 4] 일괄 영구 삭제는 요청 순서와 상관없이 지정 게시판을 먼저 판정한다 — 앞쪽 대상이 사용 중이어도 409 다")
    void deleteBoardMastersInBatch_rejectsDesignatedBeforeOtherChecks() {
        BoardMaster active = BoardMaster.builder().bbsId("BBS_01").useYn("Y").build();
        BoardMaster qna = BoardMaster.builder().bbsId("BBSMSTR_DDDDDDDDDDDD").bbsTtl("Q&A 게시판").useYn("N").build();
        given(boardMasterRepository.findAllWithOptionByBbsIdIn(List.of("BBS_01", "BBSMSTR_DDDDDDDDDDDD")))
                .willReturn(List.of(active, qna));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBS_01", "BBSMSTR_DDDDDDDDDDDD"))).willReturn(List.of("BBS_01"));

        assertThatThrownBy(() -> boardMasterService.deleteBoardMastersInBatch("user1", List.of("BBS_01", "BBSMSTR_DDDDDDDDDDDD")))
                .hasFieldOrPropertyWithValue("errorCode",
                        nuri.business.domain.board.exception.BoardErrorCode.DESIGNATED_BOARD_NOT_PURGEABLE)
                .hasMessageContaining("[Q&A 게시판]");
        verify(boardMasterRepository, never()).deleteAll(anyList());
        verifyNoInteractions(sensitiveAudit);
    }

    @Test
    @DisplayName("[ADR-0043 결정 4] 지정을 다른 게시판으로 옮기면 옛 지정 게시판은 다시 영구 삭제할 수 있다 — 판정은 설정을 따른다")
    void deleteBoardMasterPhysically_followsConfiguredDesignations() {
        boardIdProperties.setQnaId("BBSMSTR_QQQQQQQQQQQQ");
        BoardMaster master = BoardMaster.builder().bbsId("BBSMSTR_DDDDDDDDDDDD").useYn("N").build();
        given(boardMasterRepository.findById("BBSMSTR_DDDDDDDDDDDD")).willReturn(Optional.of(master));
        given(boardRepository.findBbsIdsHavingAnyArticles(List.of("BBSMSTR_DDDDDDDDDDDD"))).willReturn(List.of());

        boardMasterService.deleteBoardMasterPhysically("user1", "BBSMSTR_DDDDDDDDDDDD");

        verify(boardMasterRepository).deleteById("BBSMSTR_DDDDDDDDDDDD");
    }

    // ── [2026-10-26 ADR-0043 결정 3] 귀속 커뮤니티 요약 ─────────────────────────────

    private BoardMasterService serviceWithCommunityPort(nuri.foundation.core.community.CommunityBoardAccessPort port) {
        return new BoardMasterService(boardMasterRepository, boardRepository, boardMasterMapper, port, changeRecorder,
                boardIdProperties, sensitiveAudit);
    }

    @Test
    @DisplayName("[ADR-0043 결정 3] 귀속 커뮤니티 요약은 포트가 알려 준 이름·이용 가능 여부를 싣고, 귀속이 없으면 싣지 않는다")
    void communityOf_usesCommunityPort() {
        var port = mock(nuri.foundation.core.community.CommunityBoardAccessPort.class);
        given(port.summary(7L)).willReturn(Optional.of(
                new nuri.foundation.core.community.CommunityBoardAccessPort.CommunitySummary("독서 모임", false)));
        BoardMasterService service = serviceWithCommunityPort(port);

        assertThat(service.communityOf(7L))
                .isEqualTo(new nuri.business.service.board.dto.BoardMasterCommunity(7L, "독서 모임", false));
        assertThat(service.communityOf(null)).isNull();
    }

    @Test
    @DisplayName("[ADR-0043 결정 3] 커뮤니티 기능이 없거나 커뮤니티를 찾지 못하면 이름·이용 가능 여부가 null 이다(확인 불가, 통과로 추정하지 않는다)")
    void communityOf_isUnknownWithoutPortOrSummary() {
        assertThat(serviceWithCommunityPort(null).communityOf(7L))
                .isEqualTo(new nuri.business.service.board.dto.BoardMasterCommunity(7L, null, null));

        var port = mock(nuri.foundation.core.community.CommunityBoardAccessPort.class);
        given(port.summary(7L)).willReturn(Optional.empty());
        assertThat(serviceWithCommunityPort(port).communityOf(7L))
                .isEqualTo(new nuri.business.service.board.dto.BoardMasterCommunity(7L, null, null));
    }

    @Test
    @DisplayName("[ADR-0043 결정 3] 한 쪽의 요약은 커뮤니티마다 한 번만 묻고 귀속이 없는 게시판은 건너뛴다")
    void communitiesOf_asksOncePerCommunity() {
        var port = mock(nuri.foundation.core.community.CommunityBoardAccessPort.class);
        given(port.summary(anyLong())).willReturn(Optional.of(
                new nuri.foundation.core.community.CommunityBoardAccessPort.CommunitySummary("모임", true)));
        java.util.List<Long> cmntySns = new java.util.ArrayList<>(java.util.Arrays.asList(7L, null, 7L, 8L));

        var communities = serviceWithCommunityPort(port).communitiesOf(cmntySns);

        assertThat(communities).containsOnlyKeys(7L, 8L);
        verify(port).summary(7L);
        verify(port).summary(8L);
        verifyNoMoreInteractions(port);
    }

    @Test
    @DisplayName("[ADR-0043 결정 3] 목록 투영의 귀속 번호를 목록 DTO 로 옮긴다")
    void boardMasterListCarriesCommunityId() {
        BoardMasterSearchResult row = BoardMasterSearchResult.builder().bbsId("BBS_C").bbsTtl("모임 게시판").cmntySn(7L).build();
        given(boardMasterRepository.searchBoardMasters(any(), any(Pageable.class))).willReturn(new PageImpl<>(List.of(row)));

        Page<BoardMasterDto> page = boardMasterService.getBoardMasterList("", null, org.springframework.data.domain.PageRequest.of(0, 10));

        assertThat(page.getContent().get(0).getCmntySn()).isEqualTo(7L);
    }

    @Test
    @DisplayName("[ADR-0043, ATTR-15] 게시판 첨부 상한의 최댓값은 서버 전역 상한(요청당 파일 수·파일당 크기)과 같다")
    void boardAttachmentLimitMaximumsMatchServerLimits() throws Exception {
        java.lang.reflect.Field count = nuri.business.service.file.FileService.class.getDeclaredField("MAX_FILES_PER_REQUEST");
        java.lang.reflect.Field bytes = nuri.business.service.file.FileService.class.getDeclaredField("MAX_FILE_SIZE_BYTES");
        count.setAccessible(true);
        bytes.setAccessible(true);
        assertThat(BoardMasterDto.MAX_ATTACHMENT_FILE_COUNT).isEqualTo(count.getInt(null));
        assertThat(BoardMasterDto.MAX_ATTACHMENT_FILE_BYTES).isEqualTo(bytes.getLong(null));
    }
}
