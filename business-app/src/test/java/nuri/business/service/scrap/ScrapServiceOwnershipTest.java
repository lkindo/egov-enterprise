package nuri.business.service.scrap;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.scrap.dto.ScrapMapper;
import nuri.business.service.scrap.dto.ScrapMapperImpl;
import nuri.business.support.AuthorizationTestPrincipal;
import nuri.foundation.core.board.BoardPostAccessPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.Mockito.doThrow;
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

    @Mock
    private BoardPostAccessPort boardPostAccess;

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

    @Test
    @DisplayName("🔒 내부 게시글 스크랩은 원본 열람 검증을 거치고 요청 본문 bbsId·pstSn 은 무시한다")
    void boardPostScrapVerifiesAccessAndIgnoresClientTargetIds() {
        String url = "/admin/community/boards/detail?bbsId=BBS-1&pstSn=31";
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", url)).willReturn(List.of());
        given(scrapRepository.save(any(Scrap.class))).willReturn(ownedBy("owner", 50L, url));

        Long scrapSn = scrapService.createScrap("owner", ScrapDto.builder()
                .bbsId("FORGED-BBS")
                .pstSn(999L)
                .scrapNm("공지 보관")
                .scrapUrl(url)
                .scrapExpln("설명")
                .useYn("Y")
                .build());

        assertThat(scrapSn).isEqualTo(50L);
        verify(boardPostAccess).assertScrapablePost("BBS-1", 31L);
        ArgumentCaptor<Scrap> captor = ArgumentCaptor.forClass(Scrap.class);
        verify(scrapRepository).save(captor.capture());
        assertThat(captor.getValue().getBbsId()).isNull();
        assertThat(captor.getValue().getPstSn()).isNull();
    }

    @Test
    @DisplayName("스크랩 제목·설명만 바꿀 때는 기존 URL 의 원본 게시글이 마감·삭제됐더라도 수정이 막히지 않으며, 이미 활성인 중복 등록은 409 를 우선한다")
    void unchangedUrlMetadataEditAndActiveDuplicateDoNotReverifyBoardPost() {
        String closedPostUrl = "/admin/community/boards/detail?bbsId=BBS-CLOSED&pstSn=55";
        Scrap existing = ownedBy("owner", 51L, " " + closedPostUrl + " ");
        given(scrapRepository.findById(51L)).willReturn(Optional.of(existing));
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", closedPostUrl))
                .willReturn(List.of());
        authenticateAs("owner", "USER");

        scrapService.updateScrap(51L, "owner", ScrapDto.builder()
                .scrapNm("새 제목")
                .scrapUrl(closedPostUrl)
                .scrapExpln("새 메모")
                .useYn("Y")
                .build());

        assertThat(existing.getScrapNm()).isEqualTo("새 제목");
        assertThat(existing.getScrapExpln()).isEqualTo("새 메모");
        assertThat(existing.getScrapUrl()).isEqualTo(closedPostUrl);
        verify(boardPostAccess, never()).assertScrapablePost(any(), any());

        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", closedPostUrl))
                .willReturn(List.of(existing));
        Scrap another = ownedBy("owner", 52L, "https://other.example.com");
        given(scrapRepository.findById(52L)).willReturn(Optional.of(another));
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> scrapService.updateScrap(52L, "owner", ScrapDto.builder()
                        .scrapNm("중복 수정").scrapUrl(closedPostUrl).useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> scrapService.createScrap("owner", ScrapDto.builder()
                        .scrapNm("중복 등록").scrapUrl(closedPostUrl).useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        verify(boardPostAccess, never()).assertScrapablePost(any(), any());
    }

    @Test
    @DisplayName("🔒 삭제·미존재·비밀글·비회원 커뮤니티 내부 게시글 경로는 신규 등록·되살리기·URL 변경 수정에서 거부한다")
    void unreadableOrMissingBoardPostCannotBeScrappedOrRevived() {
        String secretUrl = "/admin/community/boards/detail?bbsId=BBS-SECRET&pstSn=77";
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(boardPostAccess).assertScrapablePost("BBS-SECRET", 77L);

        Scrap inactive = ownedBy("owner", 21L, secretUrl);
        inactive.update("옛 이름", secretUrl, "옛 설명", "N");
        lenient().when(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", secretUrl))
                .thenReturn(List.of(inactive));

        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> scrapService.createScrap("owner", ScrapDto.builder()
                        .scrapNm("비밀글 보관 시도").scrapUrl(secretUrl).useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(inactive.getUseYn()).isEqualTo("N");
        verify(scrapRepository, never()).save(any(Scrap.class));

        Scrap editing = ownedBy("owner", 42L, "https://safe.example.com");
        given(scrapRepository.findById(42L)).willReturn(Optional.of(editing));
        authenticateAs("owner", "USER");
        String legacySecretUrl = "/cop/bbs/selectBoardArticle.do?bbsId=BBS-SECRET&nttId=77";
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> scrapService.updateScrap(42L, "owner", ScrapDto.builder()
                        .scrapNm("레거시 우회 시도").scrapUrl(legacySecretUrl).useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThat(editing.getScrapUrl()).isEqualTo("https://safe.example.com");
    }

    @Test
    @DisplayName("🔒 게시글 판정 포트가 없으면 내부 게시글 스크랩을 통과시키지 않는다(fail-closed)")
    void missingBoardAccessPortFailsClosedForBoardPostUrl() {
        ScrapService withoutPort = new ScrapService(scrapRepository, scrapMapper);
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> withoutPort.createScrap("owner", ScrapDto.builder()
                        .scrapNm("포트 부재").scrapUrl("/admin/community/boards/detail?bbsId=BBS-1&pstSn=31").useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("🔒 위험한 스킴이나 잘못된 내부 게시글 주소는 400 으로 거부한다")
    void unsafeOrMalformedBoardScrapUrlsAreRejected() {
        for (String invalidUrl : List.of(
                "javascript:alert(1)",
                "//evil.example.com/phish",
                "https://safe.example.com\n/injected",
                "/admin/community/boards/detail",
                "/admin/community/boards/detail?bbsId=&pstSn=31",
                "/admin/community/boards/detail?bbsId=BBS_ID_LONGER_THAN_TWENTY_CHARS&pstSn=31",
                "/admin/community/boards/detail?bbsId=BBS-1&pstSn=0",
                "/admin/community/boards/detail?bbsId=BBS-1&pstSn=abc",
                "/admin/community/boards/detail?bbsId=BBS-1&pstSn=31&nttId=99",
                "/admin/community/boards/detail?bbsId=BBS-1&bbsId=BBS-2&pstSn=31",
                "/admin/community/boards/detail?bbsId=%ZZ&pstSn=31",
                "/cop/bbs/selectBoardArticle.do?bbsId=BBS-1")) {
            assertThatExceptionOfType(BusinessException.class)
                    .as("잘못된 주소가 통과했다: " + invalidUrl)
                    .isThrownBy(() -> scrapService.createScrap("owner", ScrapDto.builder()
                            .scrapNm("잘못된 주소").scrapUrl(invalidUrl).useYn("Y").build()))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        verify(scrapRepository, never()).save(any(Scrap.class));
    }

    @Test
    @DisplayName("🔒 대소문자 변형 쿼리(bbsid·pstsn)도 게시글 열람 검증을 거치며, 일반 내부 경로·외부 URL 은 막지 않는다")
    void caseInsensitiveBoardParamsAreVerifiedWhileNonBoardUrlsPass() {
        String trickyInternal = "/portal/shortcut?bbsid=BBS-SECRET&pstsn=88";
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(boardPostAccess).assertScrapablePost("BBS-SECRET", 88L);
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> scrapService.createScrap("owner", ScrapDto.builder()
                        .scrapNm("대소문자 우회 시도").scrapUrl(trickyInternal).useYn("Y").build()))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", "/admin/dashboard"))
                .willReturn(List.of());
        given(scrapRepository.findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc("owner", "https://ext.example.com/view?bbsId=EXT&pstSn=1"))
                .willReturn(List.of());
        given(scrapRepository.save(any(Scrap.class))).willReturn(ownedBy("owner", 60L, "/admin/dashboard"));

        assertThat(scrapService.createScrap("owner", ScrapDto.builder()
                .scrapNm("대시보드").scrapUrl("/admin/dashboard").useYn("Y").build())).isEqualTo(60L);
        assertThat(scrapService.createScrap("owner", ScrapDto.builder()
                .scrapNm("외부 링크").scrapUrl("https://ext.example.com/view?bbsId=EXT&pstSn=1").useYn("Y").build())).isEqualTo(60L);
    }
}
