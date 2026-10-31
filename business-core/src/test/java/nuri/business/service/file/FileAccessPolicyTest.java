package nuri.business.service.file;

import nuri.business.domain.file.FileMaster;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 🔒 첨부 도달성 인가 판정 표 검증 — {@link FileAccessPolicy}.
 *
 * <p>[왜 DB 없이 검증하는가] 참조원 조회를 {@link AttachmentReferenceResolver} 포트로 분리했기 때문에
 * 판정 표 전체(업로더/소유/공유/관리자/거부)를 실제 DB 없이 결정론적으로 검증할 수 있다.
 * DB 를 띄워야만 돌아가는 인가 테스트는 결국 돌지 않게 되고, 돌지 않는 게이트는 없는 게이트다.
 *
 * <p>[대조군] 각 허용 케이스마다 <b>같은 조건에서 근거만 제거하면 403</b> 임을 함께 단언한다.
 * 허용만 단언하면 정책이 전부 허용해도 통과하는 vacuous 테스트가 된다.
 */
@DisplayName("FileAccessPolicy — 첨부 도달성 인가")
class FileAccessPolicyTest {

    private static final Long ATCH_FILE_SN = 101L;
    private static final String UPLOADER_LOGIN_ID = "uploader";
    private static final String OTHER_LOGIN_ID = "someone-else";
    private static final String OTHER_ESNTL_ID = "USR_0000000000000002";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ------------------------------------------------------------------ 허용

    @Test
    @DisplayName("업로더 본인은 참조 행이 없어도 열람한다 — 업로드 직후 미첨부 창")
    void uploaderCanReadOwnOrphanUpload() {
        authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");

        assertThatCode(() -> policy(grantsNone()).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("개인 귀속 참조 행의 당사자는 열람한다")
    void ownerOfPersonalReferencingRowCanRead() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(false, true, true, true, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("🔒 개인 귀속 참조의 열람 전용 당사자(메모보고 수신자)는 열람하지만 삭제하지 못한다")
    void personalReaderCanReadButNotDelete() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
        AttachmentReferenceResolver.Grants recipient =
                new AttachmentReferenceResolver.Grants(false, false, true, false, false, true);

        assertThatCode(() -> policy(recipient).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .as("메모보고 수신자가 받은 보고의 첨부를 열지 못한다")
                .doesNotThrowAnyException();
        assertThatExceptionOfType(BusinessException.class)
                .as("열람 전용 당사자가 남의 메모 첨부를 지웠다")
                .isThrownBy(() -> policy(recipient).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("🔒 수신자도 작성자도 아닌 사람은 메모보고 첨부를 열지 못한다 — 관리자 우회도 없다(PERSONAL)")
    void neitherRecipientNorAuthorIsDenied() {
        AttachmentReferenceResolver.Grants stranger =
                new AttachmentReferenceResolver.Grants(false, false, true, false, false, false);

        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
        assertThatExceptionOfType(BusinessException.class)
                .as("수신자도 작성자도 아닌 사람이 메모 첨부를 열었다")
                .isThrownBy(() -> policy(stranger).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        authenticate("admin", "USR_ADMIN_0000000001", "ROLE_ADMIN");
        assertThatExceptionOfType(BusinessException.class)
                .as("관리자가 개인 귀속 메모 첨부를 우회해 열었다")
                .isThrownBy(() -> policy(stranger).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("개인 귀속 참조의 당사자는 공유 참조가 함께 있어도 열람한다")
    void personalOwnerCanReadAttachmentWithMixedReferences() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(true, true, true, true, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("일정 본문 제한은 공유·파일관리자 우회를 막고 기존 삭제 권한은 바꾸지 않는다")
    void domainReadRestrictionBlocksOtherSharedGrantsAndFileAdminOnlyForReading() {
        var grants = new AttachmentReferenceResolver.Grants(true, true, false, false, false, false, true);
        for (String group : List.of("ROLE_USER", "ROLE_ADMIN")) {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, group);
            assertThatExceptionOfType(BusinessException.class)
                    .isThrownBy(() -> policy(grants).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
            assertThatCode(() -> policy(grants).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }
        var restricted = new AttachmentReferenceResolver.Grants(false, false, false, false, false, false, true);
        assertThatCode(() -> policy(restricted).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .as("기존 FILE_DELETE_ALL 대행은 읽기 제한으로 바뀌지 않는다").doesNotThrowAnyException();
    }

    @Test
    @DisplayName("일정의 읽기 제한보다 기존 개인 참조 당사자 판정과 업로더 예외가 우선한다")
    void domainReadRestrictionPreservesPersonalPartiesAndUploader() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
        var personalOwner = new AttachmentReferenceResolver.Grants(false, true, true, true, false, false, true);
        var personalReader = new AttachmentReferenceResolver.Grants(false, false, true, false, false, true, true);
        for (var grants : List.of(personalOwner, personalReader)) {
            assertThatCode(() -> policy(grants).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }
        assertThatExceptionOfType(BusinessException.class)
                .isThrownBy(() -> policy(personalReader).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)));
        authenticate(UPLOADER_LOGIN_ID, "uploader-internal", "ROLE_USER");
        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(false, false, false, false, false, false, true))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("공유 근거(비밀글 아닌 게시글 등)가 있으면 타인도 열람한다")
    void sharedContentIsReadableByAnyAuthenticatedUser() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(true, false, false, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("공유 근거와 개인 귀속 참조가 함께 있으면 무관한 사용자는 열람하지 못한다")
    void sharedGrantDoesNotOverridePersonalReferencePrivacy() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(true, false, true, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("공유 참조의 소유자여도 다른 개인 귀속 참조가 함께 있으면 열람하지 못한다")
    void sharedSourceOwnerCannotOverrideForeignPersonalReference() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(true, true, true, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("참조원 조회 실패는 이미 확인한 소유·공유 근거로 덮을 수 없다")
    void resolutionFailureOverridesKnownOwnerAndSharedGrants() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(true, true, false, false, true))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("관리자도 참조원 조회 실패를 우회하지 못한다")
    void adminCannotOverrideResolutionFailure() {
        authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, false, false, false, true))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("업로더 본인은 공유·개인 참조가 함께 있어도 자기 첨부를 열람한다")
    void uploaderCanReadOwnAttachmentWithMixedReferences() {
        authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");

        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(true, false, true, false, true))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("업로더 조기 허용은 참조원 장애와 무관하며 조회기조차 호출하지 않는다")
    void uploaderEarlyGrantDoesNotResolveReferences() {
        authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");
        FileAccessPolicy policy = new FileAccessPolicy((atchFileSn, loginId, esntlId) -> {
            throw new AssertionError("업로더 조기 허용 뒤에는 참조원을 조회하면 안 된다");
        });

        assertThatCode(() -> policy.assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("관리자는 개인 귀속 참조원이 없을 때 열람한다 — 고아 첨부·관리 콘솔")
    void adminCanReadWhenNoPersonalReference() {
        authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");

        assertThatCode(() -> policy(grantsNone()).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    // ------------------------------------------------------------------ 거부

    @Test
    @DisplayName("🚨 근거 없는 타인은 거부한다 — 이것이 고친 수평 IDOR 이다")
    void unrelatedUserIsDenied() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(grantsNone()).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("🚨 관리자도 개인 귀속(쪽지·상벌 등) 첨부는 열람하지 못한다 — 프라이버시 가드(AGENTS.md H3)")
    void adminCannotReadPersonalAttachment() {
        authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, false, true, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("SYSTEM 롤도 개인 귀속 첨부에서는 동일하게 막힌다")
    void systemRoleCannotReadPersonalAttachment() {
        authenticate("sys", "USR_SYS", "ROLE_SYSTEM");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, false, true, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("미인증 주체는 거부한다 — 필터 체인과 별개의 서비스 레이어 이중 검증(BE 헌법 제8조)")
    void unauthenticatedIsDenied() {
        assertThatThrownBy(() -> policy(grantsNone()).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("🚨 미인증 주체는 **공유 근거가 있어도** 거부한다 — 미인증 조기 반환이 무의미하지 않음을 증명")
    void unauthenticatedIsDeniedEvenForSharedContent() {
        // 이 케이스가 없으면 미인증 판정(loginId·esntlId 모두 null)이 뒤쪽 fallthrough 거부와
        // 구분되지 않는다 — 실제로 2026-08-04 pitest 에서 그 조건의 negated-conditional 뮤테이션이
        // 살아남았다. 공유 근거가 있는 첨부(공개 게시글 등)는 그 분기를 지우면 **미인증자에게 열린다**.
        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(true, false, false, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("loginId 만 있고 esntlId 가 없는 주체도 정상 판정된다 — 두 축 중 하나만으로 인증 성립")
    void loginIdAloneIsSufficientToBeConsideredAuthenticated() {
        authenticate(UPLOADER_LOGIN_ID, null, "ROLE_USER");

        assertThatCode(() -> policy(grantsNone()).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("업로더 판정은 loginId 축이다 — esntlId 가 같아도 loginId 가 다르면 근거가 되지 못한다")
    void uploaderMatchIsOnLoginIdAxis() {
        // frst_rgtr_id 에는 loginId 가 저장된다(BaseEntity). esntlId 로 비교하면 영영 일치하지 않거나
        // 최악의 경우 다른 사람과 일치한다 — 이 축을 테스트로 못박는다.
        authenticate(OTHER_LOGIN_ID, UPLOADER_LOGIN_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(grantsNone()).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class);
    }

    // ----------------------------------------------------------- 연결(재게시)

    @Test
    @DisplayName("업로더 본인은 미첨부 파일을 업무에 연결할 수 있다")
    void uploaderCanAttachOwnUpload() {
        authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");

        assertThatCode(() -> policy(grantsNone()).assertAttachable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("기존 참조 행의 소유자라도 원 업로더가 아니면 재게시할 수 없다")
    void referenceOwnerCannotAttachForeignUpload() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, true, true, true, false))
                .assertAttachable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("공유 콘텐츠를 읽을 수 있다는 사실만으로 파일을 재게시할 수 없다")
    void sharedReaderCannotAttach() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(true, false, false, false, false))
                .assertAttachable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("관리자도 타인이 업로드한 파일을 공유 자원에 재게시할 수 없다")
    void adminCannotAttachForeignUpload() {
        authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");

        assertThatThrownBy(() -> policy(grantsNone()).assertAttachable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("미인증 주체는 업로더 표시나 참조 근거와 무관하게 파일을 연결할 수 없다")
    void unauthenticatedCannotAttach() {
        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, true, false, false, false))
                .assertAttachable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    // ------------------------------------------------------------- 레지스트리

    @Nested
    @DisplayName("참조원 레지스트리")
    class Registry {

        @Test
        @DisplayName("파생 로그(자료활용 통계)는 어떤 접근권도 부여하지 않는다")
        void derivedSourceGrantsNothing() {
            AttachmentSource stats = AttachmentSource.DATA_USE_STATS;
            assertThat(stats.sensitivity()).isEqualTo(AttachmentSource.Sensitivity.DERIVED);
            assertThat(stats.sharedPredicate()).isNull();
            assertThat(stats.ownerByLoginIdPredicate()).isNull();
            assertThat(stats.ownerByEsntlIdPredicate()).isNull();
        }

        @Test
        @DisplayName("개인 귀속 참조원은 공유 근거를 갖지 않는다 — 하나라도 가지면 전체 공개가 된다")
        void personalSourcesNeverGrantSharedAccess() {
            for (AttachmentSource source : AttachmentSource.values()) {
                if (source.sensitivity() == AttachmentSource.Sensitivity.PERSONAL) {
                    assertThat(source.sharedPredicate())
                            .as("개인 귀속 참조원 %s 가 공유 근거를 가지면 안 된다", source)
                            .isNull();
                }
            }
        }

        /**
         * 참조원 목록이 줄 때는 커버리지 축소인지 대상 소멸인지를 근거와 함께 남긴다. 참조원이 줄어도 판정은 느슨해지지 않는다 —
         * 등록되지 않은 참조원은 근거를 만들지 못하는(fail-closed) 구조이기 때문이다. 목록 변천의 이력은 git 과 결정 기록에 있다.
         */
        @Test
        @DisplayName("등록된 참조원 테이블은 중복 없이 13종이다 — 물리 스키마 실측(2026-08-05) 12종 + 콘텐츠 페이지 이미지(V2_137)")
        void registryMatchesMeasuredSchema() {
            List<String> tables = AttachmentSource.registeredTables();
            assertThat(tables).hasSize(13).doesNotHaveDuplicates();
        }

        @Test
        @DisplayName("🚨 팝업은 URL 문자열로 첨부를 참조한다 — 전용 컬럼만 census 하면 통째로 놓친다")
        void popupLinksByUrlNotByAttachmentIdColumn() {
            // 2026-08-04: 최초 census 를 atch_file_sn 컬럼 기준으로 돌려 이 도메인이 보이지 않았고,
            // 그 결과 팝업 이미지가 업로더 외에는 403 이 됐다(E2E 05-public-experience 가 잡음).
            assertThat(AttachmentSource.POPUP.linksByAttachmentSnColumn()).isFalse();
            assertThat(AttachmentSource.POPUP.linkagePredicate()).contains("file_url");

            for (AttachmentSource source : AttachmentSource.values()) {
                if (source != AttachmentSource.POPUP) {
                    assertThat(source.linksByAttachmentSnColumn())
                            .as("%s 의 연결 방식이 바뀌었다면 레지스트리 린터의 판정 축도 함께 봐야 한다", source)
                            .isTrue();
                }
            }
        }

        @Test
        @DisplayName("🚨 팝업 연결 술어는 LIKE 가 아니라 정확 일치다 — 와일드카드 주입으로 전체 매칭 방지")
        void popupLinkageRejectsWildcardInjection() {
            String predicate = AttachmentSource.POPUP.linkagePredicate();
            assertThat(predicate)
                    .as("LIKE 를 쓰면 요청자가 '%%' 를 첨부 ID 로 보내 모든 팝업에 매칭시켜 공유 근거를 만든다")
                    .doesNotContainIgnoringCase("like");
            assertThat(AttachmentSource.POPUP.linkageParameters(7L))
                    .as("저장되는 두 URL 형태(정규·레거시)를 모두 비교해야 기존 행이 살아난다")
                    .containsExactly("/api/v1/files/7", "/api/v1/files/download?fileId=7");
        }

        @Test
        @DisplayName("각 참조원은 자기 물리 테이블명을 반환한다 — 레지스트리↔SQL 사이의 유일한 연결 고리")
        void everySourceExposesItsPhysicalTable() {
            assertThat(AttachmentSource.BOARD.table()).isEqualTo("tb_bbs_item");
            assertThat(AttachmentSource.NOTE.table()).isEqualTo("tb_note_info");
            assertThat(AttachmentSource.DATA_USE_STATS.table()).isEqualTo("tb_dta_use_stats");
            for (AttachmentSource source : AttachmentSource.values()) {
                assertThat(source.table())
                        .as("%s 의 테이블명이 비었다면 SQL 이 조립되지 않는다", source)
                        .startsWith("tb_");
            }
        }

        @Test
        @DisplayName("쪽지의 소유 판정은 발신·수신 두 축을 모두 본다 — 한쪽만 보면 상대가 자기 쪽지를 못 연다")
        void notePredicateCoversBothSenderAndRecipient() {
            String predicate = AttachmentSource.NOTE.ownerByEsntlIdPredicate();
            assertThat(predicate).contains("tb_note_sndng").contains("tb_note_rcptn");
            assertThat(predicate.chars().filter(c -> c == '?').count())
                    .as("파라미터 자리표시자 수가 바뀌면 바인딩이 어긋나 SQL 이 깨진다")
                    .isEqualTo(2);
        }
    }

    // ------------------------------------------------------------------ 삭제 판정

    /**
     * 🗑 삭제 판정 표 — {@link FileAccessPolicy#assertDeletable}.
     *
     * <p>열람 표와의 차이는 단 하나, <b>공유 근거가 삭제를 열지 않는다</b>는 점이다. 그 대조군을
     * 반드시 함께 단언한다 — 그것이 없으면 "열람 정책을 그대로 재사용" 한 구현도 통과한다.
     */
    @Nested
    @DisplayName("삭제 판정")
    class Deletion {

        @Test
        @DisplayName("업로더 본인은 참조 행이 없어도 지운다 — 글 저장 전 잘못 올린 파일 되돌리기")
        void uploaderCanDeleteOwnOrphanUpload() {
            authenticate(UPLOADER_LOGIN_ID, "USR_0000000000000001", "ROLE_USER");

            assertThatCode(() -> policy(grantsNone()).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("참조 행의 소유자는 지운다")
        void ownerOfReferencingRowCanDelete() {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

            assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(
                    false, true, false, false, false))
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("🚨 PERSONAL과 SHARED 참조가 섞이면 SHARED 소유자는 개인 첨부를 지우지 못한다")
        void sharedOwnerCannotDeleteMixedPersonalAttachment() {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
            AttachmentReferenceResolver.Grants mixedButNotPersonalOwner =
                    new AttachmentReferenceResolver.Grants(true, true, true, false, false);

            assertThatThrownBy(() -> policy(mixedButNotPersonalOwner)
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class)
                    .extracting(ex -> ((BusinessException) ex).getErrorCode())
                    .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }

        @Test
        @DisplayName("PERSONAL과 SHARED 참조가 섞여도 개인 참조 당사자는 삭제할 수 있다")
        void personalOwnerCanDeleteMixedPersonalAttachment() {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
            AttachmentReferenceResolver.Grants mixedPersonalOwner =
                    new AttachmentReferenceResolver.Grants(true, true, true, true, false);

            assertThatCode(() -> policy(mixedPersonalOwner)
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("🚨 공유 근거만 있는 타인은 읽을 수는 있어도 지우지 못한다 — 열람 정책 재사용 방지")
        void sharedReaderCannotDelete() {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
            AttachmentReferenceResolver.Grants sharedOnly =
                    new AttachmentReferenceResolver.Grants(true, false, false, false, false);

            assertThatCode(() -> policy(sharedOnly).assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
            assertThatThrownBy(() -> policy(sharedOnly).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class)
                    .extracting(ex -> ((BusinessException) ex).getErrorCode())
                    .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }

        @Test
        @DisplayName("관리자는 개인 귀속 참조원이 없을 때 지운다")
        void adminCanDeleteWhenNoPersonalReference() {
            authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");

            assertThatCode(() -> policy(grantsNone()).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("🚨 관리자도 개인 귀속 첨부는 지우지 못한다 — 열람과 같은 프라이버시 가드(H3)")
        void adminCannotDeletePersonalAttachment() {
            authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");

            assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(
                    false, false, true, false, false))
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("🚨 참조원 해석 실패는 다른 소유 근거와 관리자 권한보다 우선해 삭제를 거부한다")
        void resolutionFailureDeniesOwnerAndAdmin() {
            AttachmentReferenceResolver.Grants failedWithOwner =
                    new AttachmentReferenceResolver.Grants(true, true, false, false, true);
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
            assertThatThrownBy(() -> policy(failedWithOwner)
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class)
                    .extracting(ex -> ((BusinessException) ex).getErrorCode())
                    .isEqualTo(CommonErrorCode.ACCESS_DENIED);

            AttachmentReferenceResolver.Grants failedWithoutKnownReference =
                    new AttachmentReferenceResolver.Grants(false, false, false, false, true);
            authenticate("admin", "USR_ADMIN", "ROLE_ADMIN");
            assertThatThrownBy(() -> policy(failedWithoutKnownReference)
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class)
                    .extracting(ex -> ((BusinessException) ex).getErrorCode())
                    .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }

        @Test
        @DisplayName("근거 없는 타인과 미인증 주체는 거부한다")
        void unrelatedAndUnauthenticatedAreDenied() {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
            assertThatThrownBy(() -> policy(grantsNone()).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class);

            SecurityContextHolder.clearContext();
            assertThatThrownBy(() -> policy(grantsNone()).assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class);
        }
    }

    // ------------------------------------------------------------------ 유틸

    private FileAccessPolicy policy(AttachmentReferenceResolver.Grants grants) {
        return new FileAccessPolicy((atchFileSn, loginId, esntlId) -> grants);
    }

    private AttachmentReferenceResolver.Grants grantsNone() {
        return AttachmentReferenceResolver.Grants.none();
    }

    private FileMaster masterOwnedBy(String loginId) {
        FileMaster master = new FileMaster(ATCH_FILE_SN);
        master.setFrstRgtrId(loginId);
        return master;
    }

    private void authenticate(String loginId, String esntlId, String role) {
        CustomUserDetails principal = nuri.business.support.AuthorizationTestPrincipal.principal(loginId, esntlId, role);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }
}
