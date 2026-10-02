package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import nuri.business.service.addressbook.AddressBookService;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Stale whole-list requests must not silently overwrite contacts saved by another editor. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class AddressBookSnapshotConcurrencyIntegrationTest {
    @Autowired private AddressBookService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @PersistenceContext private EntityManager entityManager;

    private long book;
    private long firstMember;
    private long secondMember;
    private Long foreignBook;
    private String ownerLogin;
    private String ownerEsntl;
    private String otherLogin;
    private String otherEsntl;

    @BeforeEach
    void prepareOwnAddressBook() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        ownerLogin = "ABL" + suffix;
        ownerEsntl = "ABE" + suffix;
        otherLogin = "ABF" + suffix;
        otherEsntl = "ABG" + suffix;
        user(ownerEsntl, ownerLogin);
        user(otherEsntl, otherLogin);
        book = book(ownerEsntl, ownerLogin);
        firstMember = contact(book, "연락처 A", "a@example.invalid");
        secondMember = contact(book, "연락처 B", "b@example.invalid");
        authenticate(ownerLogin, ownerEsntl, List.of());
    }

    @AfterEach
    void removeOwnFixture() {
        SecurityContextHolder.clearContext();
        removeBook(book);
        if (foreignBook != null) removeBook(foreignBook);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?, ?)", ownerEsntl, otherEsntl);
    }

    @ParameterizedTest(name = "same member={0}")
    @ValueSource(booleans = {false, true})
    void staleSequentialSavePreservesTheFirstContactChange(boolean sameMember) {
        AddressBookDto first = snapshot();
        AddressBookDto stale = snapshot();
        member(first, firstMember).setNm("선행 수정 A");
        member(stale, sameMember ? firstMember : secondMember).setNm("후행 수정");

        service.updateAddressBook(ownerEsntl, first);

        assertConflict(stale);
        assertThat(contactNames()).containsExactly("선행 수정 A", "연락처 B");
        assertThat(jdbc.queryForObject("SELECT use_yn FROM tb_adbk_manage WHERE adbk_sn=?", String.class, book)).isEqualTo("Y");
        // 새 스냅샷에 새 의도를 적용하는 것은 허용한다. 오래된 전체 목록에 새 token만 붙이지 않는다.
        AddressBookDto refreshed = snapshot();
        assertThat(refreshed.getEditToken()).isNotEqualTo(first.getEditToken());
        member(refreshed, sameMember ? firstMember : secondMember).setNm("최신 확인 후 수정");
        service.updateAddressBook(ownerEsntl, refreshed);
        assertThat(contactNames()).containsExactly(sameMember ? "최신 확인 후 수정" : "선행 수정 A",
                sameMember ? "연락처 B" : "최신 확인 후 수정");
    }

    @ParameterizedTest(name = "first operation adds={0}")
    @ValueSource(booleans = {true, false})
    void staleSavePreservesConcurrentAdditionOrDeletion(boolean addFirst) {
        AddressBookDto first = snapshot();
        AddressBookDto stale = snapshot();
        if (addFirst) {
            first.getAdbkMan().add(AddressBookUserDto.builder().nm("새 연락처")
                    .emlAddr("new@example.invalid").build());
        } else {
            first.getAdbkMan().removeIf(contact -> contact.getAdbkMbrSn().equals(firstMember));
        }
        member(stale, secondMember).setNm("오래된 목록에서 수정");
        service.updateAddressBook(ownerEsntl, first);

        assertConflict(stale);

        assertThat(contactNames()).containsExactlyElementsOf(addFirst
                ? List.of("연락처 A", "연락처 B", "새 연락처") : List.of("연락처 B"));
        assertThat(jdbc.queryForObject("SELECT eml_addr FROM tb_adbk_info WHERE adbk_mbr_sn=?", String.class, secondMember))
                .isEqualTo("b@example.invalid");
    }

    @ParameterizedTest(name = "same member={0}")
    @ValueSource(booleans = {false, true})
    void simultaneousTransactionsCommitOneSaveAndRejectTheStaleContender(boolean sameMember) throws Exception {
        AddressBookDto first = snapshot();
        AddressBookDto second = snapshot();
        member(first, firstMember).setNm("선행 트랜잭션");
        member(second, sameMember ? firstMember : secondMember).setNm("후행 트랜잭션");
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var firstPid = new AtomicInteger();
        String application = "addressbook-contender-" + book;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var leading = executor.submit(() -> {
                authenticate(ownerLogin, ownerEsntl, List.of());
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        firstPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        service.updateAddressBook(ownerEsntl, first);
                        entityManager.flush();
                        applied.countDown();
                        await(release);
                    });
                    return "saved";
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            java.util.concurrent.Future<String> contender;
            try {
                boolean ready = applied.await(15, TimeUnit.SECONDS);
                if (!ready && leading.isDone()) leading.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("선행 저장이 실제 PostgreSQL 트랜잭션에 반영됨").isTrue();
                contender = executor.submit(() -> {
                    authenticate(ownerLogin, ownerEsntl, List.of());
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            service.updateAddressBook(ownerEsntl, second);
                        });
                        return "saved";
                    } catch (BusinessException rejected) {
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                        return "conflict";
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                assertWaitingOnBook(application, firstPid.get());
            } finally {
                release.countDown();
            }
            assertThat(leading.get(20, TimeUnit.SECONDS)).isEqualTo("saved");
            assertThat(contender.get(20, TimeUnit.SECONDS)).isEqualTo("conflict");
        }
        assertThat(contactNames()).containsExactly("선행 트랜잭션", "연락처 B");
        AddressBookDto refreshed = snapshot();
        member(refreshed, sameMember ? firstMember : secondMember).setNm("최신 상태에서 재작성");
        service.updateAddressBook(ownerEsntl, refreshed);
        assertThat(contactNames()).containsExactly(sameMember ? "최신 상태에서 재작성" : "선행 트랜잭션",
                sameMember ? "연락처 B" : "최신 상태에서 재작성");
    }

    @Test
    void missingTokenDoesNotChangeTheHeaderOrContacts() {
        AddressBookDto request = snapshot();
        request.setEditToken(null);
        request.setAdbkNm("토큰 없는 변경");
        member(request, firstMember).setNm("토큰 없는 연락처 수정");

        assertConflict(request);

        assertThat(jdbc.queryForObject("SELECT adbk_nm FROM tb_adbk_manage WHERE adbk_sn=?", String.class, book))
                .isEqualTo("경합 검증 주소록");
        assertThat(contactNames()).containsExactly("연락처 A", "연락처 B");
    }

    @Test
    void tokensAreStableForRepeatedReadsAndChangeAfterAHeaderOnlySave() {
        AddressBookDto before = snapshot();
        assertThat(before.getEditToken()).matches("[a-f0-9]{64}");
        assertThat(snapshot().getEditToken()).isEqualTo(before.getEditToken());
        AddressBookDto edit = snapshot();
        edit.setAdbkNm("이름을 변경한 주소록");
        edit.setAdbkMan(null);

        service.updateAddressBook(ownerEsntl, edit);

        AddressBookDto after = snapshot();
        assertThat(after.getEditToken()).matches("[a-f0-9]{64}").isNotEqualTo(before.getEditToken());
        assertThat(after.getAdbkNm()).isEqualTo("이름을 변경한 주소록");
        assertThat(contactNames()).containsExactly("연락처 A", "연락처 B");
        before.setAdbkNm("오래된 헤더 수정");
        before.setAdbkMan(null);
        assertConflict(before);
        assertThat(snapshot().getAdbkNm()).isEqualTo("이름을 변경한 주소록");
    }

    @Test
    void foreignAndDuplicateMemberIdsRollBackTheWholeRequest() {
        foreignBook = book(otherEsntl, otherLogin);
        long foreignMember = contact(foreignBook, "외부 연락처", "foreign@example.invalid");
        AddressBookDto foreign = snapshot();
        foreign.setAdbkNm("거부할 외부 구성원 요청");
        foreign.getAdbkMan().add(AddressBookUserDto.builder().adbkMbrSn(foreignMember).nm("섞인 연락처").build());
        assertThatThrownBy(() -> service.updateAddressBook(ownerEsntl, foreign))
                .isInstanceOfSatisfying(BusinessException.class, rejected ->
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE));

        AddressBookDto duplicate = snapshot();
        duplicate.setAdbkNm("거부할 중복 구성원 요청");
        duplicate.getAdbkMan().add(member(duplicate, firstMember));
        assertThatThrownBy(() -> service.updateAddressBook(ownerEsntl, duplicate))
                .isInstanceOfSatisfying(BusinessException.class, rejected ->
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE));

        assertThat(snapshot().getAdbkNm()).isEqualTo("경합 검증 주소록");
        assertThat(contactNames()).containsExactly("연락처 A", "연락처 B");
        assertThat(jdbc.queryForObject("SELECT nm FROM tb_adbk_info WHERE adbk_mbr_sn=?", String.class, foreignMember))
                .isEqualTo("외부 연락처");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Y", "N"})
    void omittedUseYnPreservesItsCurrentValue(String useYn) {
        jdbc.update("UPDATE tb_adbk_manage SET use_yn=? WHERE adbk_sn=?", useYn, book);
        AddressBookDto request = snapshot();
        request.setUseYn(null);
        request.setAdbkNm("사용 여부 보존");

        service.updateAddressBook(ownerEsntl, request);

        assertThat(jdbc.queryForObject("SELECT use_yn FROM tb_adbk_manage WHERE adbk_sn=?", String.class, book)).isEqualTo(useYn);
        assertThat(contactNames()).containsExactly("연락처 A", "연락처 B");
    }

    @Test
    void editTokenDoesNotBypassOwnerPrivacyOrTheSeparateReadAndWritePermissions() {
        AddressBookDto ownerRequest = snapshot();
        ownerRequest.setAdbkNm("허용하지 않을 변경");
        // 내부 PK가 소유자와 같아도 로그인 ID가 다르면 감사 컬럼의 소유자가 아니다.
        authenticate(otherLogin, ownerEsntl, List.of());
        assertDeniedReadAndWrite(ownerRequest);
        authenticate(otherLogin, otherEsntl, List.of());
        assertDeniedReadAndWrite(ownerRequest);
        SecurityContextHolder.clearContext();
        assertDeniedReadAndWrite(ownerRequest);

        authenticate(otherLogin, otherEsntl, List.of("ADBK_READ_ALL"));
        AddressBookDto readOnly = service.getAddressBook(book);
        assertThat(readOnly.getAdbkMan()).hasSize(2);
        readOnly.setAdbkNm("조회 권한으로 수정 시도");
        assertThatThrownBy(() -> service.updateAddressBook(otherEsntl, readOnly))
                .isInstanceOfSatisfying(BusinessException.class, rejected ->
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
        authenticate(ownerLogin, ownerEsntl, List.of());
        assertThat(snapshot().getAdbkNm()).isEqualTo("경합 검증 주소록");
    }

    private AddressBookDto snapshot() {
        AddressBookDto dto = service.getAddressBook(book);
        dto.setAdbkMan(new ArrayList<>(dto.getAdbkMan()));
        return dto;
    }

    private AddressBookUserDto member(AddressBookDto dto, long memberId) {
        return dto.getAdbkMan().stream().filter(contact -> Long.valueOf(memberId).equals(contact.getAdbkMbrSn()))
                .findFirst().orElseThrow();
    }

    private void assertConflict(AddressBookDto request) {
        assertThatThrownBy(() -> service.updateAddressBook(ownerEsntl, request))
                .isInstanceOfSatisfying(BusinessException.class, rejected -> {
                    assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    assertThat(rejected.getErrorCode().getStatus().value()).isEqualTo(409);
                });
    }

    private void assertDeniedReadAndWrite(AddressBookDto request) {
        assertThatThrownBy(() -> service.getAddressBook(book))
                .isInstanceOfSatisfying(BusinessException.class, rejected ->
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
        assertThatThrownBy(() -> service.updateAddressBook(otherEsntl, request))
                .isInstanceOfSatisfying(BusinessException.class, rejected ->
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED));
    }

    private List<String> contactNames() {
        return jdbc.queryForList("SELECT nm FROM tb_adbk_info WHERE adbk_sn=? ORDER BY adbk_mbr_sn", String.class, book);
    }

    private void assertWaitingOnBook(String application, int blockerPid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        boolean waiting;
        do {
            waiting = Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_stat_activity
                        WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                          AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_adbk_manage%'
                    )
                    """, Boolean.class, application, blockerPid));
            if (!waiting) Thread.sleep(20);
        } while (!waiting && System.nanoTime() < deadline);
        assertThat(waiting).as("후행 수정은 구성원 조회 전에 동일 주소록 행의 실제 DB 잠금을 기다림").isTrue();
    }

    private void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(20, TimeUnit.SECONDS)).as("후행 잠금 대기 확인 후 선행 커밋 허용").isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Address book concurrency test interrupted", interrupted);
        }
    }

    private void authenticate(String login, String esntl, List<String> permissions) {
        var principal = CustomUserDetails.builder().userId(login).esntlId(esntl).enabled(true)
                .permissions(permissions).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private void user(String esntl, String login) {
        jdbc.update("""
                INSERT INTO tb_user_info (esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn)
                VALUES (?,?,'test-only-unusable','주소록 검증 사용자','P','N')
                """, esntl, login);
    }

    private long book(String writerEsntl, String authorLogin) {
        return jdbc.queryForObject("""
                INSERT INTO tb_adbk_manage (adbk_nm,rls_scope_cd,use_yn,wrter_id,frst_rgtr_id)
                VALUES ('경합 검증 주소록','PUBLIC','Y',?,?) RETURNING adbk_sn
                """, Long.class, writerEsntl, authorLogin);
    }

    private long contact(long bookId, String name, String email) {
        return jdbc.queryForObject("""
                INSERT INTO tb_adbk_info (adbk_sn,nm,eml_addr)
                VALUES (?,?,?) RETURNING adbk_mbr_sn
                """, Long.class, bookId, name, email);
    }

    private void removeBook(long bookId) {
        jdbc.update("DELETE FROM tb_adbk_info WHERE adbk_sn=?", bookId);
        jdbc.update("DELETE FROM tb_adbk_manage WHERE adbk_sn=?", bookId);
    }
}
