package nuri.config;

import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 테스트용 데이터 초기화 설정
 * - 운영(prod) 환경을 제외한 개발/테스트 환경에서만 동작
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@Profile("!prod & !test")
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
                    .bbsAttrCd("BBSA01")
                    .useYn("Y")
                    .replyPsblYn("Y")
                    .fileAtchPsblYn("Y")
                    .atchPsblFileCnt(3)
                    .optnFrstRegisterId("webmaster")
                    .build();
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
                    .password(passwordEncoder.encode("1"))
                    .userNm(userNm)
                    .esntlId(esntlId)
                    .homeadres("Seoul")
                    .passwordHint("P01")
                    .passwordCnsr("Hint Answer")
                    .homeendTelno("0000")
                    .areaNo("02")
                    .homemiddleTelno("0000")
                    .zip("00000")
                    .userSttsCd("A")
                    .sbscrbYmd(LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                    .build();

            userRepository.save(user);

            UserAuthority authority = UserAuthority.builder()
                    .uniqId(esntlId)
                    .authorCode(role)
                    .build();

            userAuthorityRepository.save(authority);
            log.info(">>> Test user created successfully: {}", userId);
        });
    }
}
