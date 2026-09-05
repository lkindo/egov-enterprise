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
    @DisplayName("소유 근거(참조 행의 당사자)가 있으면 열람한다")
    void ownerOfReferencingRowCanRead() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(false, true, true))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("공유 근거(비밀글 아닌 게시글 등)가 있으면 타인도 열람한다")
    void sharedContentIsReadableByAnyAuthenticatedUser() {
        authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");

        assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(true, false, false))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
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

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, false, true))
                .assertReadable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("SYSTEM 롤도 개인 귀속 첨부에서는 동일하게 막힌다")
    void systemRoleCannotReadPersonalAttachment() {
        authenticate("sys", "USR_SYS", "ROLE_SYSTEM");

        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, false, true))
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
        assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(true, false, false))
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
         * [2026-08-05] 14 → 12. <b>커버리지 축소가 아니라 대상 소멸이다.</b> 두 번에 걸쳐 줄었다.
         *
         * <ul>
         *   <li><b>14 → 13</b> ({@code V2_40}): {@code AttachmentSource.FAQ}({@code tb_faq_info}).
         *       FAQ 는 게시판({@code tb_bbs_item}, {@code bbs_id='BBSMSTR_AAAAAAAAAAAA'})으로 통합돼
         *       운영 중이고 전용 도메인은 死자산이었다 — {@code tb_faq_info} <b>0행</b>, 게시판 FAQ 281행,
         *       FE 의 {@code /api/v1/faqs} 호출 0건.</li>
         *   <li><b>13 → 12</b> ({@code V2_41}): {@code AttachmentSource.CONSULT}({@code tb_dscsn_list}).
         *       상담 도메인 전체가 미사용이었다 — 데이터 0행 · 메뉴 등록 0 · FE 호출 0 · 인가 애노테이션 0.</li>
         * </ul>
         *
         * <p><b>두 테이블 모두 첨부 참조가 0건이었으므로 도달성 판정이 바뀌는 첨부는 없다.</b>
         * 참조원이 줄어든 것이지 판정이 느슨해진 것이 아니다 —
         * 등록되지 않은 참조원은 근거를 만들지 못하는(fail-closed) 구조이기 때문이다.
         */
        @Test
        @DisplayName("등록된 참조원 테이블은 중복 없이 12종이다 — 물리 스키마 실측(2026-08-05)과 일치")
        void registryMatchesMeasuredSchema() {
            List<String> tables = AttachmentSource.registeredTables();
            assertThat(tables).hasSize(12).doesNotHaveDuplicates();
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
            assertThat(predicate)
                    .as("저장되는 두 URL 형태(정규·레거시)를 모두 비교해야 기존 행이 살아난다")
                    .contains("'/api/v1/files/' || ?")
                    .contains("'/api/v1/files/download?fileId=' || ?");
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

            assertThatCode(() -> policy(new AttachmentReferenceResolver.Grants(false, true, true))
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("🚨 공유 근거만 있는 타인은 읽을 수는 있어도 지우지 못한다 — 열람 정책 재사용 방지")
        void sharedReaderCannotDelete() {
            authenticate(OTHER_LOGIN_ID, OTHER_ESNTL_ID, "ROLE_USER");
            AttachmentReferenceResolver.Grants sharedOnly = new AttachmentReferenceResolver.Grants(true, false, false);

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

            assertThatThrownBy(() -> policy(new AttachmentReferenceResolver.Grants(false, false, true))
                    .assertDeletable(masterOwnedBy(UPLOADER_LOGIN_ID)))
                    .isInstanceOf(BusinessException.class);
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
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(loginId)
                .esntlId(esntlId)
                .userNm("tester")
                .password("N/A")
                .authorityCodes(List.of(role))
                .build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }
}
