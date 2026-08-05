package nuri.business.service.board;

import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.business.service.board.dto.SatisfactionMapper;
import nuri.business.service.board.dto.SatisfactionMapperImpl;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("SatisfactionService 단위 테스트")
class SatisfactionServiceTest {

    @Mock
    private SatisfactionRepository satisfactionRepository;

    // 실제 MapStruct 생성 구현을 @InjectMocks 생성자에 주입 (매핑 동작 실검증)
    @Spy
    private SatisfactionMapper satisfactionMapper = new SatisfactionMapperImpl();

    // 목이 아니라 실제 인코더다 — encode/matches 왕복이 진짜로 성립하는지 봐야 한다.
    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @InjectMocks
    private SatisfactionService satisfactionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    /** 익명 작성분(작성자 없음 + 비밀번호 있음)을 만든다. */
    private Satisfaction anonymousEntity(String rawPassword) {
        return Satisfaction.builder()
                .dgstfnSn(10L)
                .pswd(new BCryptPasswordEncoder().encode(rawPassword))
                .build();
    }

    // ---------- 등록 ----------

    @Test
    @DisplayName("등록 - 비밀번호는 평문으로 저장되지 않는다")
    void createHashesPassword() {
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01").pstId("1").dgstfnScr(5).dgstfnCn("Good").pswd("secret").build();
        given(satisfactionRepository.save(any(Satisfaction.class)))
                .willAnswer(inv -> inv.getArgument(0));

        satisfactionService.createSatisfaction("user1", dto);

        ArgumentCaptor<Satisfaction> captor = ArgumentCaptor.forClass(Satisfaction.class);
        verify(satisfactionRepository).save(captor.capture());
        String stored = captor.getValue().getPswd();
        assertThat(stored).as("평문이 그대로 저장되면 안 된다").isNotEqualTo("secret");
        assertThat(new BCryptPasswordEncoder().matches("secret", stored))
                .as("해시가 원문과 왕복 검증돼야 한다").isTrue();
    }

    /** 익명 작성분은 비밀번호가 유일한 소유 증명이다 — 없으면 아무도 수정·삭제할 수 없게 된다. */
    @Test
    @DisplayName("등록 - 익명 작성인데 비밀번호가 없으면 거부한다")
    void createRejectsAnonymousWithoutPassword() {
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01").pstId("1").dgstfnScr(5).build();

        assertThatThrownBy(() -> satisfactionService.createSatisfaction(null, dto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("비밀번호가 필요합니다");
        verify(satisfactionRepository, never()).save(any());
    }

    // ---------- 수정·삭제 인가 (회귀 가드) ----------

    /**
     * 🔒 <b>이 테스트가 종전 결함을 막는다.</b> 원래 {@code deleteSatisfaction} 은 {@code pswd} 를
     * 파라미터로 받고도 <b>검사하지 않았다</b> — ID만 알면 누구나 남의 만족도를 지울 수 있었다.
     * (그리고 옛 테스트는 비밀번호 없는 엔티티에 임의 값을 넘겨 성공하는 것을 정답으로 못 박고 있었다.)
     */
    @Test
    @DisplayName("🔒 삭제 - 비밀번호가 틀리면 거부한다")
    void deleteRejectsWrongPassword() {
        Satisfaction entity = anonymousEntity("secret");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> satisfactionService.deleteSatisfaction(10L, "attacker", "wrong"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("본인 확인");
        assertThat(entity.getUseYn()).as("거부됐으면 논리삭제 플래그가 바뀌면 안 된다").isNotEqualTo("N");
    }

    @Test
    @DisplayName("🔒 삭제 - 비밀번호를 아예 주지 않으면 거부한다")
    void deleteRejectsMissingPassword() {
        Satisfaction entity = anonymousEntity("secret");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> satisfactionService.deleteSatisfaction(10L, "attacker", null))
                .isInstanceOf(BusinessException.class);
        assertThat(entity.getUseYn()).isNotEqualTo("N");
    }

    @Test
    @DisplayName("삭제 - 비밀번호가 맞으면 논리 삭제된다")
    void deleteAcceptsCorrectPassword() {
        Satisfaction entity = anonymousEntity("secret");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        satisfactionService.deleteSatisfaction(10L, "user1", "secret");

        assertThat(entity.getUseYn()).isEqualTo("N");
        assertThat(entity.getLastMdfrId()).isEqualTo("user1");
    }

    /** 🔒 수정도 같은 결함이 있었다 — 점수·내용을 아무나 바꿀 수 있었다. */
    @Test
    @DisplayName("🔒 수정 - 비밀번호가 틀리면 점수가 바뀌지 않는다")
    void updateRejectsWrongPassword() {
        Satisfaction entity = anonymousEntity("secret");
        entity.update(5, "원본", null);
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));
        SatisfactionDto dto = SatisfactionDto.builder()
                .dgstfnSn(10L).dgstfnScr(1).dgstfnCn("변조").pswd("wrong").build();

        assertThatThrownBy(() -> satisfactionService.updateSatisfaction("attacker", dto))
                .isInstanceOf(BusinessException.class);
        assertThat(entity.getDgstfnScr()).as("거부됐으면 원본이 유지돼야 한다").isEqualTo(5);
        assertThat(entity.getDgstfnCn()).isEqualTo("원본");
    }

    @Test
    @DisplayName("수정 - 비밀번호가 맞으면 반영되고, 저장된 비밀번호는 바뀌지 않는다")
    void updateAcceptsCorrectPasswordAndKeepsStoredPassword() {
        Satisfaction entity = anonymousEntity("secret");
        String originalHash = entity.getPswd();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));
        SatisfactionDto dto = SatisfactionDto.builder()
                .dgstfnSn(10L).dgstfnScr(4).dgstfnCn("Updated").pswd("secret").build();

        satisfactionService.updateSatisfaction("user1", dto);

        assertThat(entity.getDgstfnScr()).isEqualTo(4);
        // dto.pswd 는 '자격 증명'이지 '새 비밀번호'가 아니다 — 겸용하면 둘을 구분할 수 없다.
        assertThat(entity.getPswd()).as("자격 증명이 새 비밀번호로 덮어써지면 안 된다").isEqualTo(originalHash);
    }

    // ---------- 조회 ----------

    @Test
    @DisplayName("만족도 목록 조회")
    void getSatisfactionList() {
        given(satisfactionRepository.findByPstIdAndBbsIdAndUseYn(anyString(), anyString(), anyString()))
                .willReturn(List.of(Satisfaction.builder().dgstfnSn(1L).build()));

        assertThat(satisfactionService.getSatisfactionList("BBS_01", "1")).hasSize(1);
    }

    @Test
    @DisplayName("만족도 평균 조회")
    void getAverageSatisfaction() {
        given(satisfactionRepository.getAverageSatisfaction(anyString(), anyString())).willReturn(4.5);

        assertThat(satisfactionService.getAverageSatisfaction("BBS_01", "1")).isEqualTo(4.5);
    }

    @Test
    @DisplayName("만족도 상세 조회 성공")
    void getSatisfaction_Success() {
        given(satisfactionRepository.findById(10L))
                .willReturn(Optional.of(Satisfaction.builder().dgstfnSn(10L).build()));

        assertThat(satisfactionService.getSatisfaction(10L).getDgstfnSn()).isEqualTo(10L);
    }

    @Test
    @DisplayName("만족도 상세 조회 실패 - 리소스 없음")
    void getSatisfaction_NotFound() {
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> satisfactionService.getSatisfaction(10L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("만족도 수정 실패 - 리소스 없음")
    void updateSatisfaction_NotFound() {
        SatisfactionDto dto = SatisfactionDto.builder().dgstfnSn(10L).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> satisfactionService.updateSatisfaction("user1", dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("만족도 삭제 실패 - 리소스 없음")
    void deleteSatisfaction_NotFound() {
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> satisfactionService.deleteSatisfaction(10L, "user1", "pwd"))
                .isInstanceOf(BusinessException.class);
    }

    /** 해시 비교로 바뀌었으므로 평문 비교 시절의 기대값(문자열 동일성)은 더 이상 통하지 않는다. */
    @Test
    @DisplayName("비밀번호 확인 - 해시 비교로 일치/불일치/없음을 판정한다")
    void checkPassword() {
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(anonymousEntity("secret")));
        given(satisfactionRepository.findById(11L)).willReturn(Optional.empty());
        given(satisfactionRepository.findById(12L))
                .willReturn(Optional.of(Satisfaction.builder().dgstfnSn(12L).build())); // 비밀번호 없음

        assertThat(satisfactionService.checkPassword(10L, "secret")).isTrue();
        assertThat(satisfactionService.checkPassword(10L, "wrong")).isFalse();
        assertThat(satisfactionService.checkPassword(11L, "any")).isFalse();
        assertThat(satisfactionService.checkPassword(12L, "any"))
                .as("저장된 비밀번호가 없으면 어떤 입력도 통과시키면 안 된다").isFalse();
    }
}
