package nuri.business.service.scrap;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.scrap.dto.ScrapMapper;
import nuri.business.service.scrap.dto.ScrapMapperImpl;
import nuri.business.support.AuthorizationTestPrincipal;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 스크랩 소유권과 1인 1주소 규칙 — 실제 {@code SecurityUtil} 판정으로 본다.
 *
 * <p>{@link ScrapServiceTest} 는 소유권 가드를 정적 목으로 꺼 두고 매핑만 본다. 그래서 '남의 스크랩을 읽거나 고치거나 지울 수
 * 없다' 는 부정 시험이 어디에도 없었다. 여기서는 일반 사용자(USER 그룹, *_ALL 없음)와 관리자(ADMIN 그룹, *_ALL 보유)를
 * 권한 원장 그대로 세워 판정한다(H3 — owner-or-admin).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ScrapService 소유권·중복 판정")
class ScrapServiceOwnershipTest {

    @Mock
    private ScrapRepository scrapRepository;

    @Spy
    private ScrapMapper scrapMapper = new ScrapMapperImpl();

    @InjectMocks
    private ScrapService scrapService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticateAs(String loginId, String group) {
        SecurityContextHolder.getContext().setAuthentication(
                AuthorizationTestPrincipal.authentication(loginId, "ESNTL_" + loginId, group));
    }

    private static Scrap ownedBy(String loginId, long scrapSn, String url) {
        Scrap scrap = Scrap.builder().scrapSn(scrapSn).scrapNm("보관").scrapUrl(url).useYn("Y").build();
        scrap.setFrstRgtrId(loginId);
        return scrap;
    }

    @Test
    @DisplayName("🔒 남의 스크랩은 조회·수정·삭제 모두 403 이고 저장소를 바꾸지 않는다")
    void otherUsersScrapIsDenied() {
        Scrap victims = ownedBy("victim", 10L, "https://victim.example.com");
        given(scrapRepository.findById(10L)).willReturn(Optional.of(victims));
        authenticateAs("intruder", "USER");

        assertThatExceptionOfType(BusinessException.class)
                .as("남의 스크랩 조회가 통과했다")
                .isThrownBy(() -> scrapService.getScrap(10L))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        ScrapDto change = ScrapDto.builder().scrapNm("가로채기").scrapUrl("https://intruder.example.com").useYn("Y").build();
        assertThatExceptionOfType(BusinessException.class)
                .as("남의 스크랩 수정이 통과했다")
                .isThrownBy(() -> scrapService.updateScrap(10L, "intruder", change))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThatExceptionOfType(BusinessException.class)
                .as("남의 스크랩 삭제가 통과했다")
                .isThrownBy(() -> scrapService.deleteScrap(10L))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        assertThat(victims.getScrapNm()).isEqualTo("보관");
        assertThat(victims.getScrapUrl()).isEqualTo("https://victim.example.com");
        verify(scrapRepository, never()).delete(any(Scrap.class));
    }

    @Test
    @DisplayName("본인 스크랩은 일반 사용자도 조회·삭제한다 — 부정 시험이 소유자까지 막는 것이 아님을 대조한다")
    void ownerIsAllowed() {
        Scrap own = ownedBy("owner", 11L, "https://own.example.com");
        given(scrapRepository.findById(11L)).willReturn(Optional.of(own));
        authenticateAs("owner", "USER");

        assertThat(scrapService.getScrap(11L).getScrapUrl()).isEqualTo("https://own.example.com");
        assertThatCode(() -> scrapService.deleteScrap(11L)).doesNotThrowAnyException();
        verify(scrapRepository).delete(own);
    }

    @Test
    @DisplayName("관리자(*_ALL)는 남의 스크랩을 조회한다 — owner-or-admin 의미를 넓히지도 좁히지도 않는다")
    void adminReadsOthersScrap() {
        given(scrapRepository.findById(12L)).willReturn(Optional.of(ownedBy("someone", 12L, "https://x.example.com")));
        authenticateAs("admin", "ADMIN");

        assertThat(scrapService.getScrap(12L).getScrapSn()).isEqualTo(12L);
    }

    @Test
    @DisplayName("🔒 같은 사용자가 같은 주소를 다시 스크랩하면 409 이고 새 행을 만들지 않는다")
    void duplicateTargetIsRejected() {
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", "/admin/community/boards/detail?bbsId=B&pstSn=1"))
                .willReturn(List.of(ownedBy("owner", 20L, "/admin/community/boards/detail?bbsId=B&pstSn=1")));
        ScrapDto again = ScrapDto.builder().scrapNm("다시").scrapUrl("/admin/community/boards/detail?bbsId=B&pstSn=1")
                .useYn("Y").build();
        // 겹침 판정이 없으면 새 행을 저장해 버린다 — 그 경로가 끝까지 가서 409 부재로 드러나도록 저장을 받아 준다.
        lenient().when(scrapRepository.save(any(Scrap.class))).thenReturn(ownedBy("owner", 99L, "dup"));

        assertThatExceptionOfType(BusinessException.class)
                .as("같은 주소의 두 번째 스크랩이 저장됐다")
                .isThrownBy(() -> scrapService.createScrap("owner", again))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE)
                .withMessage("이미 같은 주소를 스크랩했습니다. 스크랩 보관함에서 확인해 주세요.");
        verify(scrapRepository, never()).save(any(Scrap.class));
    }

    @Test
    @DisplayName("사용 안 함으로 둔 같은 주소의 스크랩은 새 값으로 되살린다 — DB 유일 제약이 그 행도 세기 때문이다")
    void inactiveSameTargetIsRevived() {
        Scrap inactive = ownedBy("owner", 21L, "https://revive.example.com");
        inactive.update("옛 이름", "https://revive.example.com", "옛 설명", "N");
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", "https://revive.example.com"))
                .willReturn(List.of(inactive));
        lenient().when(scrapRepository.save(any(Scrap.class))).thenReturn(ownedBy("owner", 99L, "https://revive.example.com"));

        Long scrapSn = scrapService.createScrap("owner", ScrapDto.builder().scrapNm("새 이름")
                .scrapUrl("https://revive.example.com").scrapExpln("새 설명").useYn("Y").build());

        assertThat(scrapSn).as("사용 안 함 행을 되살리지 않고 같은 주소의 새 행을 만들었다").isEqualTo(21L);
        assertThat(inactive.getUseYn()).isEqualTo("Y");
        assertThat(inactive.getScrapNm()).isEqualTo("새 이름");
        assertThat(inactive.getScrapExpln()).isEqualTo("새 설명");
        verify(scrapRepository, never()).save(any(Scrap.class));
    }

    @Test
    @DisplayName("다른 사용자가 같은 주소를 스크랩한 것은 겹침이 아니다 — 겹침은 등록자별이다")
    void sameUrlOfAnotherUserIsNotDuplicate() {
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", "https://shared.example.com"))
                .willReturn(List.of());
        given(scrapRepository.save(any(Scrap.class))).willReturn(ownedBy("owner", 30L, "https://shared.example.com"));

        assertThat(scrapService.createScrap("owner", ScrapDto.builder().scrapNm("공유 주소")
                .scrapUrl("https://shared.example.com").useYn("Y").build())).isEqualTo(30L);
    }

    @Test
    @DisplayName("🔒 주소를 바꿔 본인의 다른 스크랩과 겹치게 하면 409 이고 값을 바꾸지 않는다")
    void updateIntoAnotherOwnTargetIsRejected() {
        Scrap editing = ownedBy("owner", 40L, "https://first.example.com");
        given(scrapRepository.findById(40L)).willReturn(Optional.of(editing));
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", "https://second.example.com"))
                .willReturn(List.of(ownedBy("owner", 41L, "https://second.example.com")));
        authenticateAs("owner", "USER");

        assertThatExceptionOfType(BusinessException.class)
                .as("본인의 다른 스크랩과 같은 주소로 바뀌었다")
                .isThrownBy(() -> scrapService.updateScrap(40L, "owner", ScrapDto.builder().scrapNm("바꿈")
                .scrapUrl("https://second.example.com").useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        assertThat(editing.getScrapUrl()).isEqualTo("https://first.example.com");
        assertThat(editing.getScrapNm()).isEqualTo("보관");
    }
}
