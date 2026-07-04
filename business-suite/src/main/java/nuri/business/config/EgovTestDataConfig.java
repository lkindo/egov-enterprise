package nuri.business.config;

import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 테스트용 데이터 초기화 설정.
 *
 * <p>[보안] 이 시더는 webmaster/TEST1 계정을 비밀번호 "1"·ROLE_ADMIN 으로 생성하고,
 * 이미 존재하면 매 부팅마다 비밀번호를 "1" 로 <b>리셋</b>한다. 과거에는 {@code @Profile("!prod & !test")}
 * 만 걸려 있어, 프로파일 없이(=default) 부팅하면 default datasource 가 가리키는 <b>운영 OCI DB</b>에
 * 대고 실행됐다. 결과적으로 (1) 누구나 webmaster/"1" 로 ADMIN 로그인 가능, (2) 자격증명 로테이션이
 * 매 부팅 "1" 로 되돌려져 무력화됐다.
 *
 * <p>이제 명시적 opt-in 프로퍼티 {@code egov.seed-test-data=true} 가 있을 때만 동작한다.
 * CI e2e 는 docker-compose 의 SPRING_APPLICATION_JSON 에서 이 값을 켠다. 운영/기본 부팅에서는
 * 프로퍼티가 없어 시더가 아예 등록되지 않는다({@code @Profile("!prod & !test")} 는 방어적으로 유지).
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@Profile("!prod & !test")
@ConditionalOnProperty(name = "egov.seed-test-data", havingValue = "true")
public class EgovTestDataConfig {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final BoardMasterRepository boardMasterRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    @Transactional
    public void initTestData() {
        createTestUser("webmaster", "관리자", "ROLE_ADMIN", "USRCNFRM_00000000001");
        createTestUser("TEST1", "일반사용자", "ROLE_USER", "USRCNFRM_00000000002");
        
        // Initialize Test Boards for E2E
        createTestBoard("BBSMSTR_AAAAAAAAAAAA", "E2E 공지사항 (List)", "BBST01");
        createTestBoard("BBSMSTR_DDDDDDDDDDDD", "E2E Q&A (QnA)", "BBST03");
        createTestBoard("BBSMSTR_EEEEEEEEEEEE", "E2E 일정관리 (Calendar)", "BBST04");
    }

    private void createTestBoard(String bbsId, String bbsNm, String tyCode) {
        boardMasterRepository.findById(bbsId).ifPresentOrElse(board -> {
            log.info(">>> Test board already exists: {}", bbsId);
        }, () -> {
            log.info(">>> Creating test board: {} ({})", bbsNm, bbsId);
            BoardMaster board = BoardMaster.builder()
                    .bbsId(bbsId)
                    .bbsTtl(bbsNm)
                    .bbsExpln(bbsNm + " 설명")
                    .bbsTypeCd(tyCode)
                    .bbsAtrbCd("BBSA01")
                    .useYn("Y")
                    .ansPsbltyYn("Y")
                    .fileAtchPsbltyYn("Y")
                    .atchPsbltyFileQty(3)
                    .build();
            board.registerOption("Y", "Y");
            boardMasterRepository.save(board);
        });
    }

    private void createTestUser(String userId, String userNm, String role, String esntlId) {
        userRepository.findById(userId).ifPresentOrElse(user -> {
            log.info(">>> Resetting password for existing test user: {}", userId);
            user.updatePassword(passwordEncoder.encode("1"));
            userRepository.save(user);
        }, () -> {
            log.info(">>> Creating test user: {} (Role: {})", userId, role);

            User user = User.builder()
                    .userId(userId)
                    .pswd(passwordEncoder.encode("1"))
                    .userNm(userNm)
                    .esntlId(esntlId)
                    .homeAddr("Seoul")
                    .pswdHint("P01")
                    .pswdCrans("Hint Answer")
                    .endTelno("0000")
                    .areaNo("02")
                    .middleTelno("0000")
                    .zip("00000")
                    .userSttsCd("A")
                    .sbscrbYmd(LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                    .build();

            userRepository.save(user);

            UserAuthority authority = UserAuthority.builder()
                    .scrtyDcsnTrgtId(esntlId)
                    .authrtId(role)
                    .build();

            userAuthorityRepository.save(authority);
            log.info(">>> Test user created successfully: {}", userId);
        });
    }
}