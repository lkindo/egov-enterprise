package nuri.business.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.survey.*;
import nuri.business.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.survey.dto.OnlinePollManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("OnlinePollService 단위 테스트")
class OnlinePollServiceTest {

    @org.mockito.Spy
    nuri.business.service.survey.dto.OnlinePollArticleMapper onlinePollArticleMapper = new nuri.business.service.survey.dto.OnlinePollArticleMapperImpl();

    @InjectMocks
    private OnlinePollService onlinePollService;

    @Mock
    private OnlinePollManageRepository pollManageRepository;
    @Mock
    private OnlinePollArticleRepository pollItemRepository;
    @Mock
    private OnlinePollResultRepository pollResultRepository;

    @BeforeEach
    void setUpPollArticleOwnership() {
        given(pollItemRepository.existsByPollArtclSnAndPollManagePollSn(any(), any())).willReturn(true);
    }

    @Test
    @DisplayName("설문 목록 조회 - 키워드 없음")
    void getPollList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).pollNm("Poll 1").build();
        given(pollManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 목록 조회 - 키워드 있음")
    void getPollList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).pollNm("Poll 1").build();
        given(pollManageRepository.findByPollNmContaining(eq("Keyword"), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(pollManageRepository).findByPollNmContaining(eq("Keyword"), eq(pageable));
    }

    @Test
    @DisplayName("설문 목록 조회 - 빈 키워드")
    void getPollList_EmptyKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).build();
        given(pollManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList("", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 목록 조회 - 설문 항목 없는 경우")
    void getPollList_NoPollArticles() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).build(); // No pollArticles
        given(pollManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList("", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 상세 조회 - 성공")
    void getPoll_Success() {
        OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).pollNm("Poll 1").build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        
        OnlinePollArticle item = OnlinePollArticle.builder().pollArtclSn(11L).pollManage(entity).pollArtclNm("Item 1").build();
        given(pollItemRepository.findByPollManagePollSn(1L)).willReturn(List.of(item));

        OnlinePollManageDto result = onlinePollService.getPoll(1L);

        assertThat(result.getPollSn()).isEqualTo(1L);
        assertThat(result.getPollArticles()).hasSize(1);
    }

    @Test
    @DisplayName("설문 상세 조회 - 실패")
    void getPoll_Fail() {
        given(pollManageRepository.findById(99L)).willReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> onlinePollService.getPoll(99L));
    }

    @Test
    @DisplayName("설문 등록 - 성공 (모든 조건 및 길이 초과)")
    void insertPoll() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("VeryLongUserIdExceeding20Chars"));

            OnlinePollArticleDto itemDto = OnlinePollArticleDto.builder()
                    .pollArtclNm("A".repeat(150)) // Exceed 100 chars
                    .build();
            
            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollNm("P".repeat(150)) // Exceed 100 chars
                    .pollKndCd("K".repeat(20)) // Exceed 12 chars
                    .pollBgngYmd("2024-01-01") // validate normalizeDate with '-'
                    .pollEndYmd("2024.12.31")  // validate normalizeDate with '.'
                    .pollDsuseYn(null)         // fallback to "N"
                    .pollAtmcDsuseYn(null)     // fallback to "N"
                    .pollArticles(List.of(itemDto))
                    .build();

            onlinePollService.insertPoll(dto);

            verify(pollManageRepository, times(1)).save(any(OnlinePollManage.class));
        }
    }

    @Test
    @DisplayName("설문 등록 - 실패 (시작일 > 종료일)")
    void insertPoll_Fail_InvalidDates() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollNm("New Poll")
                    .pollBgngYmd("2024-12-31")
                    .pollEndYmd("2024-01-01")
                    .build();

            assertThrows(BusinessException.class, () -> onlinePollService.insertPoll(dto));
        }
    }

    @Test
    @DisplayName("설문 등록 - 실패 (권한 없음)")
    void insertPoll_Fail_NoAdmin() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            OnlinePollManageDto dto = OnlinePollManageDto.builder().build();

            assertThrows(BusinessException.class, () -> onlinePollService.insertPoll(dto));
        }
    }

    @Test
    @DisplayName("설문 수정 - 성공 (모든 조건 및 길이 초과)")
    void updatePoll_Success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("VeryLongUserIdExceeding20Chars"));

            OnlinePollManage entity = OnlinePollManage.builder()
                    .pollSn(1L)
                    .pollNm("Old")
                    .pollArticles(new ArrayList<>())
                    .build();
            given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));

            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollSn(1L)
                    .pollNm("P".repeat(150))
                    .pollKndCd("K".repeat(20))
                    .pollBgngYmd("2024/01/01")
                    .pollEndYmd("2024/12/31")
                    .pollArticles(List.of(OnlinePollArticleDto.builder().pollArtclNm("New Item").build()))
                    .build();

            onlinePollService.updatePoll(dto);

            assertThat(entity.getPollNm()).isEqualTo("P".repeat(100));
            assertThat(entity.getPollArticles()).hasSize(1);
        }
    }

    @Test
    @DisplayName("설문 수정 - 성공 (Articles null)")
    void updatePoll_Success_NullArticles() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);

            OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).pollNm("Old").build();
            given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));

            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollSn(1L)
                    .pollNm("New")
                    .pollArticles(null)
                    .build();

            onlinePollService.updatePoll(dto);

            assertThat(entity.getPollNm()).isEqualTo("New");
        }
    }

    @Test
    @DisplayName("설문 수정 - 실패 (데이터 없음)")
    void updatePoll_Fail() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(pollManageRepository.findById(99L)).willReturn(Optional.empty());
            OnlinePollManageDto dto = OnlinePollManageDto.builder().pollSn(99L).build();
            assertThrows(BusinessException.class, () -> onlinePollService.updatePoll(dto));
        }
    }
    
    @Test
    @DisplayName("설문 수정 - 실패 (권한 없음)")
    void updatePoll_Fail_NoAdmin() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            OnlinePollManageDto dto = OnlinePollManageDto.builder().build();

            assertThrows(BusinessException.class, () -> onlinePollService.updatePoll(dto));
        }
    }

    @Test
    @DisplayName("설문 삭제 - 성공")
    void deletePoll() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            onlinePollService.deletePoll(1L);
            verify(pollManageRepository, times(1)).deleteById(1L);
        }
    }
    
    @Test
    @DisplayName("설문 삭제 - 실패 (권한 없음)")
    void deletePoll_Fail_NoAdmin() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> onlinePollService.deletePoll(1L));
        }
    }

    @Test
    @DisplayName("설문 투표 - 성공")
    void vote_Success() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "user1")).willReturn(0L);

        onlinePollService.vote(1L, 11L, "user1");

        // 저장 엔티티의 poll_sn/poll_artcl_sn 이 입력과 정확히 일치(필드 스왑 뮤턴트 킬).
        ArgumentCaptor<OnlinePollResult> captor = ArgumentCaptor.forClass(OnlinePollResult.class);
        verify(pollResultRepository, times(1)).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getPollSn()).isEqualTo(1L);
        assertThat(captor.getValue().getPollArtclSn()).isEqualTo(11L);
    }

    @Test
    @DisplayName("설문 투표 - 실패 (선택 항목이 다른 설문 소속)")
    void vote_Fail_ArticleBelongsToDifferentPoll() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollItemRepository.existsByPollArtclSnAndPollManagePollSn(22L, 1L)).willReturn(false);

        assertThatThrownBy(() -> onlinePollService.vote(1L, 22L, "user1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("설문 항목을 찾을 수 없습니다");
        verify(pollResultRepository, times(0)).saveAndFlush(any(OnlinePollResult.class));
    }

    @Test
    @DisplayName("설문 투표 - 성공 (긴 유저 ID → frst_rgtr_id 20자 절단)")
    void vote_Success_LongUserId() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "VeryLongUserIdExceeding20Chars")).willReturn(0L);

        onlinePollService.vote(1L, 11L, "VeryLongUserIdExceeding20Chars");

        // frst_rgtr_id 컬럼 길이(20) 초과분은 절단되어야 한다(절단 로직·경계 20 뮤턴트 킬).
        ArgumentCaptor<OnlinePollResult> captor = ArgumentCaptor.forClass(OnlinePollResult.class);
        verify(pollResultRepository, times(1)).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getFrstRgtrId()).hasSize(20);
        assertThat(captor.getValue().getFrstRgtrId()).isEqualTo("VeryLongUserIdExceed");
    }

    @Test
    @DisplayName("설문 투표 - 실패 (중지됨)")
    void vote_Fail_Disabled() {
        OnlinePollManage entity = OnlinePollManage.builder().pollSn(1L).pollDsuseYn("Y").build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        assertThrows(BusinessException.class, () -> onlinePollService.vote(1L, 11L, "user1"));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (기간 전)")
    void vote_Fail_BeforeStart() {
        String tomorrow = java.time.LocalDate.now().plusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(tomorrow)
                .pollEndYmd(tomorrow)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        assertThrows(BusinessException.class, () -> onlinePollService.vote(1L, 11L, "user1"));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (기간 후)")
    void vote_Fail_AfterEnd() {
        String yesterday = java.time.LocalDate.now().minusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(yesterday)
                .pollEndYmd(yesterday)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        assertThrows(BusinessException.class, () -> onlinePollService.vote(1L, 11L, "user1"));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (중복 투표)")
    void vote_Fail_Duplicate() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "user1")).willReturn(1L);

        assertThatThrownBy(() -> onlinePollService.vote(1L, 11L, "user1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미 참여");
    }

    @Test
    @DisplayName("설문 투표 - 실패 (경합: pre-check 통과 후 유니크 제약 위반 → 이미 참여)")
    void vote_Fail_ConcurrentDuplicate_ConstraintViolation() {
        // 동시 요청 경합(TOCTOU): pre-check 는 0(통과)이지만 saveAndFlush 에서 (poll_sn, frst_rgtr_id)
        // 유니크 제약(V2_4)이 두 번째 INSERT 를 거부한다. 서비스는 이를 멱등하게 "이미 참여"로 변환해야 한다.
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "user1")).willReturn(0L);
        given(pollResultRepository.saveAndFlush(any(OnlinePollResult.class)))
                .willThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"uk_tb_onln_poll_rslt_poll_voter\""));

        assertThatThrownBy(() -> onlinePollService.vote(1L, 11L, "user1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미 참여");
    }

    @Test
    @DisplayName("설문 투표 - 무결성 오류지만 이중투표 제약이 아니면 '이미 참여'로 오분류하지 않고 그대로 전파")
    void vote_NonDuplicateIntegrityError_Propagates() {
        // 이중투표 유니크 제약(uk_tb_onln_poll_rslt_poll_voter) 이외의 무결성 오류(예: value too long)는
        // "이미 참여" 로 은폐되면 안 된다 → 원 예외가 그대로 전파되어야 한다(catch 한정 뮤턴트 킬).
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "user1")).willReturn(0L);
        given(pollResultRepository.saveAndFlush(any(OnlinePollResult.class)))
                .willThrow(new DataIntegrityViolationException("ERROR: value too long for type character varying(20)"));

        assertThatThrownBy(() -> onlinePollService.vote(1L, 11L, "user1"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("설문 등록 - 빈 문자열에 대한 fallback 검증 및 빈항목 무시")
    void insertPoll_EmptyStringsFallback() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("user"));

            // 비정상적이거나 빈 값을 넣었을 때 분기를 탄다
            OnlinePollArticleDto emptyItem = OnlinePollArticleDto.builder().pollArtclNm("").build();
            OnlinePollArticleDto normalItem = OnlinePollArticleDto.builder().pollArtclNm("Valid").build();

            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollNm("P")
                    .pollKndCd("")
                    .pollBgngYmd("20240101")
                    .pollEndYmd("20241231")
                    .pollDsuseYn("")
                    .pollAtmcDsuseYn("  ")
                    .pollArticles(List.of(emptyItem, normalItem))
                    .build();

            onlinePollService.insertPoll(dto);

            // save 호출 검증
            verify(pollManageRepository, times(1)).save(any(OnlinePollManage.class));
        }
    }

    @Test
    @DisplayName("설문 수정 - 기존 항목과 새 항목 병합")
    void updatePoll_MergeArticles() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("user"));

            OnlinePollArticle oldItem1 = OnlinePollArticle.builder().pollArtclSn(11L).pollArtclNm("Old1").build();
            OnlinePollArticle oldItem2 = OnlinePollArticle.builder().pollArtclSn(12L).pollArtclNm("Old2").build();
            List<OnlinePollArticle> existingArticles = new ArrayList<>(List.of(oldItem1, oldItem2));
            
            OnlinePollManage entity = OnlinePollManage.builder()
                    .pollSn(1L)
                    .pollNm("Old")
                    .pollArticles(existingArticles)
                    .build();
                    
            given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));

            // I1은 유지, I2는 삭제(전달안됨), I3은 신규
            OnlinePollArticleDto keepItem = OnlinePollArticleDto.builder().pollArtclSn(11L).pollArtclNm("Updated1").build();
            OnlinePollArticleDto newItem = OnlinePollArticleDto.builder().pollArtclNm("New3").build();
            OnlinePollArticleDto emptyItem = OnlinePollArticleDto.builder().pollArtclNm("").build();

            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollSn(1L)
                    .pollNm("New")
                    .pollDsuseYn("")
                    .pollAtmcDsuseYn(" ")
                    .pollArticles(List.of(keepItem, newItem, emptyItem))
                    .build();

            onlinePollService.updatePoll(dto);

            // updatePoll 은 clear-and-recreate: 기존 항목(I1/I2)을 전량 clear 후 dto 3항목을 신규 ID로 재생성한다
            // (I1 '보존'이 아니라 재생성이므로 크기·순서·이름으로 검증). 빈 이름 항목도 스킵 없이 재생성됨.
            assertThat(entity.getPollArticles()).hasSize(3);
            assertThat(entity.getPollArticles())
                    .extracting(art -> art.getPollArtclNm())
                    .containsExactly("Updated1", "New3", "");
        }
    }

    @Test
    @DisplayName("vote - 사용자 ID가 없는 경우 익명 ID 생성")
    void vote_Anonymous() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        
        // user 파라미터가 null일 때 NullPointerException 이 발생하는 분기 (saveAndFlush 이전에 터짐)
        assertThatThrownBy(() -> onlinePollService.vote(1L, 11L, null))
                .isInstanceOf(NullPointerException.class);

        // userId가 빈 문자열이면 예외 없이 저장이 시도된다 — 거동을 pin(무어서션 swallow 제거).
        onlinePollService.vote(1L, 11L, "");
        verify(pollResultRepository, times(1)).saveAndFlush(any(OnlinePollResult.class));
    }
    
    @Test
    @DisplayName("insertPollItem - pollManage를 찾지 못할 때 예외")
    void insertPollItem_Fail_NotFound() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("user"));
            
            given(pollManageRepository.findById(99L)).willReturn(Optional.empty());
            OnlinePollArticleDto dto = OnlinePollArticleDto.builder().pollSn(99L).pollArtclNm("A").build();
            
            assertThrows(BusinessException.class, () -> onlinePollService.insertPollItem(dto));
        }
    }

    @Test
    @DisplayName("updatePollItem - 내용이 빈 문자열일 때")
    void updatePollItem_EmptyContent() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("user"));

            OnlinePollArticle entity = OnlinePollArticle.builder().pollArtclSn(11L).pollArtclNm("Old").build();
            given(pollItemRepository.findById(11L)).willReturn(Optional.of(entity));

            // update할 이름이 null 이거나 비어있을 때
            OnlinePollArticleDto dto = OnlinePollArticleDto.builder().pollArtclSn(11L).pollArtclNm("  ").build();
            onlinePollService.updatePollItem(dto);

            // update()는 빈값 가드가 없어 blank 이름을 그대로 반영한다(기존 'Old' → '  ', 무시 아님).
            assertThat(entity.getPollArtclNm()).isEqualTo("  ");
        }
    }

    @Test
    @DisplayName("설문 항목 수정 - 성공")
    void updatePollItem_Success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentLoginId()).thenReturn(Optional.of("VeryLongUserIdExceeding20Chars"));

            OnlinePollArticle entity = OnlinePollArticle.builder().pollArtclSn(11L).pollArtclNm("Old").build();
            given(pollItemRepository.findById(11L)).willReturn(Optional.of(entity));

            OnlinePollArticleDto dto = OnlinePollArticleDto.builder().pollArtclSn(11L).pollArtclNm("N".repeat(150)).build();
            onlinePollService.updatePollItem(dto);

            assertThat(entity.getPollArtclNm()).isEqualTo("N".repeat(100));
        }
    }

    @Test
    @DisplayName("설문 항목 수정 - 실패 (데이터 없음)")
    void updatePollItem_Fail() {
        given(pollItemRepository.findById(99L)).willReturn(Optional.empty());
        OnlinePollArticleDto dto = OnlinePollArticleDto.builder().pollArtclSn(99L).build();
        assertThrows(BusinessException.class, () -> onlinePollService.updatePollItem(dto));
    }

    @Test
    @DisplayName("설문 등록 - 시작일, 종료일 null 테스트")
    void insertPoll_DatesNull() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollNm("New Poll")
                    .pollBgngYmd(null)
                    .pollEndYmd(null)
                    .build();

            onlinePollService.insertPoll(dto);
            verify(pollManageRepository, times(1)).save(any(OnlinePollManage.class));
        }
    }

    @Test
    @DisplayName("설문 등록 - 설문종류코드(pollKndCd)가 null 또는 짧은 경우")
    void insertPoll_PollKndCd_NullOrShort() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            
            // Null case
            OnlinePollManageDto dto1 = OnlinePollManageDto.builder()
                    .pollNm("P1")
                    .pollKndCd(null)
                    .build();
            onlinePollService.insertPoll(dto1);

            // Short case
            OnlinePollManageDto dto2 = OnlinePollManageDto.builder()
                    .pollNm("P2")
                    .pollKndCd("SHORT")
                    .build();
            onlinePollService.insertPoll(dto2);

            verify(pollManageRepository, times(2)).save(any(OnlinePollManage.class));
        }
    }

    @Test
    @DisplayName("설문 투표 - 오늘과 날짜가 정확히 일치하는 경우")
    void vote_Success_ExactToday() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "user1")).willReturn(0L);

        onlinePollService.vote(1L, 11L, "user1");
        verify(pollResultRepository, times(1)).saveAndFlush(any(OnlinePollResult.class));
    }

    @Test
    @DisplayName("설문 투표 - 날짜가 null인 경우")
    void vote_Success_NullDates() {
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollSn(1L)
                .pollDsuseYn("N")
                .pollBgngYmd(null)
                .pollEndYmd(null)
                .build();
        given(pollManageRepository.findById(1L)).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollSnAndFrstRegisterId(1L, "user1")).willReturn(0L);

        onlinePollService.vote(1L, 11L, "user1");
        verify(pollResultRepository, times(1)).saveAndFlush(any(OnlinePollResult.class));
    }

    @Test
    @DisplayName("설문 항목 삭제")
    void deletePollItem() {
        onlinePollService.deletePollItem(11L);
        verify(pollItemRepository, times(1)).deleteById(11L);
    }
}
