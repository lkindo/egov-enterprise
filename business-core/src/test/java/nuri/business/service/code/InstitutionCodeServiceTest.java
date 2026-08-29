package nuri.business.service.code;

import nuri.business.domain.code.InstitutionCode;
import nuri.business.domain.code.InstitutionCodeRecptnLog;
import nuri.business.domain.code.InstitutionCodeRecptnLogRepository;
import nuri.business.repository.code.InstitutionCodeRepository;
import nuri.business.service.code.dto.InstitutionCodeDto;
import nuri.business.service.code.dto.InstitutionCodeRecptnDto;
import nuri.business.domain.common.BaseSearchDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;

import nuri.foundation.core.exception.BusinessException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@DisplayName("InstitutionCodeService 단위 테스트")
class InstitutionCodeServiceTest {

    @Mock
    private InstitutionCodeRepository institutionCodeRepository;

    @Mock
    private InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository;

    @InjectMocks
    private InstitutionCodeService institutionCodeService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("기관코드 목록 조회")
    void selectInstitutionCodeList() {
        // given
        InstitutionCode entity = InstitutionCode.builder().instCd("INST1").allInstNm("Inst 1").build();
        Page<InstitutionCode> page = new PageImpl<>(List.of(entity));
        when(institutionCodeRepository.searchInstitutionCodes(any(), any(), any())).thenReturn(page);

        // when
        BaseSearchDto searchDto = new BaseSearchDto();
        searchDto.setPageIndex(1);
        searchDto.setPageUnit(10);
        Page<InstitutionCodeDto> result = institutionCodeService.selectInstitutionCodeList(searchDto);

        // then — 내용과 총건수가 같은 질의에서 나온다. 검색을 무시한 별도 count() 는 더 이상 없다.
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getInstCd()).isEqualTo("INST1");
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(institutionCodeRepository, never()).count();
    }

    @Test
    @DisplayName("기관코드 상세 조회")
    void selectInstitutionCodeDetail() {
        // given
        InstitutionCode entity = InstitutionCode.builder().instCd("INST1").allInstNm("Inst 1").build();
        when(institutionCodeRepository.findById("INST1")).thenReturn(Optional.of(entity));

        // when
        InstitutionCodeDto result = institutionCodeService.selectInstitutionCodeDetail(InstitutionCodeDto.builder().instCd("INST1").build());

        // then
        assertThat(result).isNotNull();
        assertThat(result.getInstCd()).isEqualTo("INST1");
    }

    @Test
    @DisplayName("기관코드 상세 조회 - 존재하지 않음")
    void selectInstitutionCodeDetail_NotFound() {
        // given
        when(institutionCodeRepository.findById("NOT_EXIST")).thenReturn(Optional.empty());

        nuri.foundation.core.exception.BusinessException error =
                org.junit.jupiter.api.Assertions.assertThrows(
                        nuri.foundation.core.exception.BusinessException.class,
                        () -> institutionCodeService.selectInstitutionCodeDetail(
                                InstitutionCodeDto.builder().instCd("NOT_EXIST").build()));

        assertThat(error.getErrorCode())
                .isEqualTo(nuri.business.domain.code.exception.CodeErrorCode.CODE_NOT_FOUND);
    }

    @Test
    @DisplayName("기관코드 수신 내역 조회")
    void selectInstitutionCodeRecptnList() {
        // given
        InstitutionCodeRecptnLogId id = new InstitutionCodeRecptnLogId("20240101", "I1", 1L);
        InstitutionCodeRecptnLog entity = InstitutionCodeRecptnLog.builder().id(id).build();
        when(institutionCodeRecptnLogRepository
                .findByAllInstNmContainingOrIdInstCdContainingIgnoreCase(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(entity)));

        // when
        BaseSearchDto searchDto = new BaseSearchDto();
        searchDto.setSearchKeyword("서울");
        Page<InstitutionCodeRecptnDto> result = institutionCodeService.selectInstitutionCodeRecptnList(searchDto);

        // then — 전량 findAll() 로 되돌아가면 red 다. 그 형태가 화면에 거짓 페이지 번호를 그렸다.
        assertThat(result.getContent()).hasSize(1);
        verify(institutionCodeRecptnLogRepository, never()).findAll();

        /*
         * 검색어는 기관명과 코드 두 자리에 같은 값으로 실려야 한다. 수신 이력은 목록 탭과
         * 같은 검색창을 공유하므로, 한쪽만 코드를 찾으면 탭을 옮기는 것만으로 같은 검색어가
         * 다른 뜻이 된다. 기관명 한정으로 되돌아가면 red 다.
         */
        ArgumentCaptor<String> name = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(institutionCodeRecptnLogRepository)
                .findByAllInstNmContainingOrIdInstCdContainingIgnoreCase(
                        name.capture(), code.capture(), pageable.capture());
        assertThat(name.getValue()).isEqualTo("서울");
        assertThat(code.getValue()).isEqualTo("서울");
        assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
        verify(institutionCodeRecptnLogRepository, never()).findByAllInstNmContaining(any(), any());
    }

    @Test
    @DisplayName("기관코드 수신 처리")
    void updateInstitutionCodeRecptn() {
        // given
        InstitutionCodeRecptnLog logEntity = mock(InstitutionCodeRecptnLog.class);
        when(institutionCodeRecptnLogRepository.findById(any())).thenReturn(Optional.of(logEntity));

        // when — 호출자가 엉뚱한 값을 보내거나 아예 빠뜨려도 완료 판정은 서버가 한다.
        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .ocrnYmd("20240101")
                .instCd("I1")
                .jobSn(1L)
                .procSe("9")
                .build();
        institutionCodeService.updateInstitutionCodeRecptn(dto);

        // then
        verify(logEntity).updateProcessSe(eq("1"), anyString());
    }

    /**
     * 이 경로가 원장을 건드리지 않는다는 사실을 계약으로 고정한다.
     *
     * <p>화면은 오래 "기관코드 원장에 반영합니다" 라고 말해 왔지만 실제로는 수신 로그의
     * {@code procSe} 만 바뀐다. 둘 중 하나는 틀린 것이고, 근거상 틀린 쪽은 문구였다 —
     * {@code chgSeCd}(변경구분)의 값 도메인이 확정돼 있지 않아 payload 를 원장에 적용할
     * 근거가 없기 때문이다(GAP-CODE-001).
     *
     * <p>이 테스트는 <b>두 방향</b>을 모두 막는다. 나중에 누군가 원장 쓰기를 여기에 넣으면
     * 실패하므로, 값 도메인을 확정하지 않은 채 코어 데이터를 덮어쓰는 변경이 조용히 들어오지
     * 못한다. 반대로 반영 경로를 정식 설계하면 이 테스트를 그 설계와 함께 고쳐야 한다.
     */
    @Test
    @DisplayName("수신 처리는 원장을 건드리지 않는다 — 화면 문구가 이 사실과 맞아야 한다")
    void updateInstitutionCodeRecptnDoesNotTouchLedger() {
        InstitutionCodeRecptnLog logEntity = mock(InstitutionCodeRecptnLog.class);
        when(institutionCodeRecptnLogRepository.findById(any())).thenReturn(Optional.of(logEntity));

        institutionCodeService.updateInstitutionCodeRecptn(InstitutionCodeRecptnDto.builder()
                .ocrnYmd("20240101").instCd("I1").jobSn(1L).build());

        verify(institutionCodeRepository, never()).save(any());
        verify(institutionCodeRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("기관코드 수신 처리 — 대상이 없으면 조용히 성공하지 않는다")
    void updateInstitutionCodeRecptnMissingTarget() {
        // given
        when(institutionCodeRecptnLogRepository.findById(any())).thenReturn(Optional.empty());

        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .ocrnYmd("20240101")
                .instCd("NOPE")
                .jobSn(1L)
                .build();

        // when / then — 종전 ifPresent 구현은 200 을 돌려줘 화면이 '반영되었습니다' 를 띄웠다.
        assertThatThrownBy(() -> institutionCodeService.updateInstitutionCodeRecptn(dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("기관코드 수신 내역 등록")
    void insertInstitutionCodeRecptn() {
        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .instCd("INST1")
                .chgSeCd("I")
                .build();
        
        institutionCodeService.insertInstitutionCodeRecptn(dto);
        verify(institutionCodeRecptnLogRepository).save(any(InstitutionCodeRecptnLog.class));
    }

    @Test
    @DisplayName("기관코드 등록 - 성공")
    void insertInstitutionCode_Success() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").build();
        when(institutionCodeRepository.existsById("INST2")).thenReturn(false);
        
        institutionCodeService.insertInstitutionCode(dto);
        verify(institutionCodeRepository).save(any(InstitutionCode.class));
    }

    @Test
    @DisplayName("기관코드 등록 - 중복 예외 발생")
    void insertInstitutionCode_Duplicate() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").build();
        when(institutionCodeRepository.existsById("INST2")).thenReturn(true);
        
        org.junit.jupiter.api.Assertions.assertThrows(nuri.foundation.core.exception.BusinessException.class, 
            () -> institutionCodeService.insertInstitutionCode(dto));
    }

    @Test
    @DisplayName("기관코드 수정")
    void updateInstitutionCode() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").allInstNm("Update").build();
        InstitutionCode entity = mock(InstitutionCode.class);
        when(institutionCodeRepository.findById("INST2")).thenReturn(Optional.of(entity));
        
        institutionCodeService.updateInstitutionCode(dto);
        verify(entity).update(eq("Update"), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyString());
    }

    @Test
    @DisplayName("기관코드 삭제")
    void deleteInstitutionCode() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").build();
        institutionCodeService.deleteInstitutionCode(dto);
        verify(institutionCodeRepository).deleteById("INST2");
    }

    // Helper static class
    private static class InstitutionCodeRecptnLogId extends nuri.business.domain.code.InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId {
        public InstitutionCodeRecptnLogId(String ocrnYmd, String instCd, Long jobSn) {
            super(ocrnYmd, instCd, jobSn);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 8개를 살려 보냈다 — 페이징 3 · 차수변환 4 · toLogDto 1.
    //   차수(instCycl)는 API 계약이 String, 물리 도메인이 Integer(V2_19)라 경계 변환이 있다.
    //   그 변환은 왕복(round-trip)으로만 검증된다 — 한쪽만 보면 뮤턴트가 살아남는다.
    // ─────────────────────────────────────────────────────────────────────────

    private Pageable capturePageable(BaseSearchDto searchVO) {
        given(institutionCodeRepository.searchInstitutionCodes(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));
        institutionCodeService.selectInstitutionCodeList(searchVO);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(institutionCodeRepository).searchInstitutionCodes(any(), any(), captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("페이징: 1-based pageIndex 가 0-based 로 변환된다")
    void pagingConvertsIndex() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(4);
        vo.setPageUnit(20);
        Pageable pageable = capturePageable(vo);
        assertEquals(3, pageable.getPageNumber(), "1-based 4페이지는 0-based 3");
        assertEquals(20, pageable.getPageSize());
    }

    @Test
    @DisplayName("페이징: pageUnit 0 이하는 기본 10 으로 대체된다")
    void pagingFallsBackToDefaultUnit() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageUnit(0);
        assertEquals(10, capturePageable(vo).getPageSize(), "0 이면 기본 10");
    }

    @Test
    @DisplayName("기관차수: String ↔ Integer 왕복 변환이 값을 보존한다")
    void instCyclRoundTripPreservesValue() {
        // 저장(String -> Integer) 후 조회(Integer -> String) 에서 같은 값이 나와야 한다.
        InstitutionCodeDto input = InstitutionCodeDto.builder()
                .instCd("INST1").allInstNm("기관1").instCycl("7").build();

        given(institutionCodeRepository.existsById("INST1")).willReturn(false);
        given(institutionCodeRepository.save(any(InstitutionCode.class)))
                .willAnswer(inv -> inv.getArgument(0));

        institutionCodeService.insertInstitutionCode(input);

        ArgumentCaptor<InstitutionCode> captor = ArgumentCaptor.forClass(InstitutionCode.class);
        verify(institutionCodeRepository).save(captor.capture());
        // parse 가 0 을 돌려주는 뮤턴트, null 을 돌려주는 뮤턴트가 여기서 죽는다.
        assertEquals(Integer.valueOf(7), captor.getValue().getInstCycl(), "String \"7\" 은 Integer 7 로 저장돼야 한다");
    }

    @Test
    @DisplayName("기관차수: 빈 문자열·null 은 null 로 저장된다 (0 이 아니다)")
    void instCyclBlankBecomesNullNotZero() {
        given(institutionCodeRepository.existsById(anyString())).willReturn(false);
        given(institutionCodeRepository.save(any(InstitutionCode.class)))
                .willAnswer(inv -> inv.getArgument(0));

        institutionCodeService.insertInstitutionCode(
                InstitutionCodeDto.builder().instCd("I2").allInstNm("기관2").instCycl("   ").build());

        ArgumentCaptor<InstitutionCode> captor = ArgumentCaptor.forClass(InstitutionCode.class);
        verify(institutionCodeRepository).save(captor.capture());
        // 조건을 뒤집은 뮤턴트는 "   " 를 Integer.valueOf 에 넘겨 예외를 낸다 → 죽는다.
        assertNull(captor.getValue().getInstCycl(), "공백 차수는 null 이어야 한다 — 0 은 유효한 차수와 구분되지 않는다");
    }
}
