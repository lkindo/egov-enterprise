package nuri.business.service.code;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import nuri.business.domain.code.AdministCode;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.service.code.dto.AdministCodeDto;
import nuri.business.support.AuthorizationTestPrincipal;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdministCodeHierarchyBudgetTest {
    private final Map<String, AdministCode> rows = new HashMap<>();
    private AdministCodeRepository repository;
    private AdministCodeService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                AuthorizationTestPrincipal.authentication("admin", "ESNTL_admin", "ROLE_ADMIN"));
        repository = mock(AdministCodeRepository.class);
        when(repository.existsById(anyString())).thenAnswer(invocation -> rows.containsKey(invocation.getArgument(0)));
        when(repository.findById(anyString())).thenAnswer(invocation -> Optional.ofNullable(rows.get(invocation.getArgument(0))));
        doAnswer(invocation -> {
            AdministCode row = invocation.getArgument(0);
            rows.put(row.getAdmdstCd(), row);
            return null;
        }).when(repository).insert(any(AdministCode.class));
        service = new AdministCodeService(repository);
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(ints = {49, 50})
    void changingParentAllowsUpToFiftyAncestorsIncludingTheRequestedParent(int ancestors) {
        preloadChain(ancestors, null);
        AdministCode target = put(0, null);

        service.updateAdministCode(code(0), dto(code(1)), "admin");

        assertThat(target.getUpAdmdstCd()).isEqualTo(code(1));
        assertThat(target.getAdmdstZoneNm()).isEqualTo("Updated name");
    }

    @Test
    void changingParentRejectsFiftyOneAncestorsWithoutChangingTheEntity() {
        preloadChain(51, null);
        AdministCode target = put(0, null);

        BusinessException failure = assertThrows(BusinessException.class,
                () -> service.updateAdministCode(code(0), dto(code(1)), "admin"));

        assertThat(failure.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(failure.getMessage()).contains("확인할 수 없습니다");
        assertThat(target.getUpAdmdstCd()).isNull();
        assertThat(target.getAdmdstZoneNm()).isEqualTo("Original name");
        verify(repository, atMost(51)).findById(anyString());
    }

    @Test
    void creationAllowsFiftyAncestors() {
        preloadChain(50, null);

        assertThat(service.createAdministCode(dto(code(1)), "admin")).isEqualTo(code(0));

        assertThat(rows.get(code(0)).getUpAdmdstCd()).isEqualTo(code(1));
    }

    @Test
    void creationRejectsFiftyOneAncestorsBeforeInsert() {
        preloadChain(51, null);

        BusinessException failure = assertThrows(BusinessException.class,
                () -> service.createAdministCode(dto(code(1)), "admin"));

        assertThat(failure.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rows).doesNotContainKey(code(0));
        verify(repository, never()).insert(any(AdministCode.class));
        verify(repository, atMost(50)).findById(anyString());
    }

    @Test
    void closingTheAuditFiftyTwoNodeCycleIsRejectedWithoutChangingTheParent() {
        preloadChain(51, code(0));
        AdministCode target = put(0, null);

        BusinessException failure = assertThrows(BusinessException.class,
                () -> service.updateAdministCode(code(0), dto(code(1)), "admin"));

        assertThat(failure.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(target.getUpAdmdstCd()).isNull();
        assertThat(target.getAdmdstZoneNm()).isEqualTo("Original name");
    }

    @ParameterizedTest
    @ValueSource(ints = {51, 100})
    void unchangedParentAllowsNameUpdatesBelowAnExistingDeepChain(int ancestors) {
        preloadChain(ancestors, null);
        AdministCode target = put(0, code(1));

        service.updateAdministCode(code(0), dto(code(1)), "admin");

        assertThat(target.getUpAdmdstCd()).isEqualTo(code(1));
        assertThat(target.getAdmdstZoneNm()).isEqualTo("Updated name");
        verify(repository, atMost(51)).findById(anyString());
    }

    @Test
    void targetAtTheFiftiethAncestorIsStillRejectedAsACycle() {
        preloadChain(49, code(0));
        AdministCode target = put(0, null);

        BusinessException failure = assertThrows(BusinessException.class,
                () -> service.updateAdministCode(code(0), dto(code(1)), "admin"));

        assertThat(failure.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(failure.getMessage()).contains("순환합니다");
        assertThat(target.getUpAdmdstCd()).isNull();
    }

    @Test
    void unchangedParentDoesNotSkipAnExistingCycleContainingTheTarget() {
        preloadChain(2, code(0));
        AdministCode target = put(0, code(1));

        assertThrows(BusinessException.class,
                () -> service.updateAdministCode(code(0), dto(code(1)), "admin"));

        assertThat(target.getAdmdstZoneNm()).isEqualTo("Original name");
    }

    @Test
    void existingCycleWithoutTheTargetKeepsItsCompatibilityBehavior() {
        preloadChain(2, code(1));
        AdministCode target = put(0, null);

        service.updateAdministCode(code(0), dto(code(1)), "admin");

        assertThat(target.getUpAdmdstCd()).isEqualTo(code(1));
    }

    @Test
    void missingDistantAncestorKeepsItsCompatibilityBehavior() {
        preloadChain(1, code(2));
        AdministCode target = put(0, null);

        service.updateAdministCode(code(0), dto(code(1)), "admin");

        assertThat(target.getUpAdmdstCd()).isEqualTo(code(1));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void theFiftiethAncestorsRootMarkerFinishesValidation(String rootMarker) {
        preloadChain(50, rootMarker);
        AdministCode target = put(0, null);

        service.updateAdministCode(code(0), dto(code(1)), "admin");

        assertThat(target.getUpAdmdstCd()).isEqualTo(code(1));
    }

    // Preload legacy/imported rows directly: the revised create contract rejects new deep paths.
    private void preloadChain(int ancestors, String lastParent) {
        for (int i = 1; i <= ancestors; i++) {
            put(i, i == ancestors ? lastParent : code(i + 1));
        }
    }

    private AdministCode put(int id, String parent) {
        AdministCode row = AdministCode.builder().admdstCd(code(id)).upAdmdstCd(parent)
                .admdstSeCd("1").admdstZoneNm("Original name").useYn("Y").build();
        rows.put(code(id), row);
        return row;
    }

    private static String code(int id) {
        return String.format(java.util.Locale.ROOT, "%010d", id);
    }

    private static AdministCodeDto dto(String parent) {
        return AdministCodeDto.builder().admdstCd(code(0)).upAdmdstCd(parent)
                .admdstSeCd("1").admdstZoneNm("Updated name").useYn("Y").build();
    }
}
