package nuri.api.config;

import java.util.function.IntConsumer;

import lombok.extern.slf4j.Slf4j;
import nuri.business.service.user.RrnoReencryptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 주민등록번호 재암호화 일회성 실행기(2026-11-25). {@code rrno-reencrypt} 프로필로 띄우면 기동 직후 한 번 돌고 종료 코드를 남기며 끝난다.
 *
 * <pre>
 *   # 모든 값을 판독하고 대상 수만 센다(기본) — application-rrno-reencrypt.yml 이 웹 서버·Flyway 를 끈다
 *   java -jar app.jar --spring.profiles.active=prod,rrno-reencrypt
 *   # 판독이 모두 성공하면 다시 쓴다
 *   java -jar app.jar --spring.profiles.active=prod,rrno-reencrypt --nuri.crypto.rrno.reencrypt.apply=true
 * </pre>
 *
 * <p>키링(RRNO_ACTIVE_KEY_ID·RRNO_KEYS_JSON)과 이전 ARIA 키(ALGORITHM_KEY, 키 교체 중이면 OLD_ALGORITHM_KEY)를 앱과 같이 준다.
 * 절차는 docs/04-operations/crypto-key-rotation.md. 실패하면 종료 코드 1 이다.
 */
@Slf4j
@Component
@Profile("rrno-reencrypt")
public class RrnoReencryptionRunner implements ApplicationRunner {

    private final RrnoReencryptionService reencryption;
    private final ApplicationContext context;
    private final boolean apply;
    private final IntConsumer exit;

    @Autowired
    public RrnoReencryptionRunner(RrnoReencryptionService reencryption, ApplicationContext context,
            @Value("${nuri.crypto.rrno.reencrypt.apply:false}") boolean apply) {
        this(reencryption, context, apply, System::exit);
    }

    RrnoReencryptionRunner(RrnoReencryptionService reencryption, ApplicationContext context, boolean apply, IntConsumer exit) {
        this.reencryption = reencryption;
        this.context = context;
        this.apply = apply;
        this.exit = exit;
    }

    @Override
    public void run(ApplicationArguments args) {
        int code;
        try {
            var result = reencryption.run(apply);
            log.info("[RRNO] {} 끝 — 대상 {}건, 다시 씀 {}건, 그 사이 바뀌어 건너뜀 {}건{}", apply ? "재암호화" : "점검",
                    result.targets(), result.rewritten(), result.changedMeanwhile(),
                    apply ? "" : " (다시 쓰려면 --nuri.crypto.rrno.reencrypt.apply=true)");
            code = result.changedMeanwhile() == 0 ? 0 : 2;
        } catch (RrnoReencryptionService.ReencryptionStopped stopped) {
            // 이 예외의 메시지는 건수·행 식별자만 담는다(값·DB 오류 원문 없음).
            log.error("[RRNO] 재암호화 멈춤: {}", stopped.getMessage());
            code = 1;
        } catch (RuntimeException failure) {
            // 그 밖의 예외 메시지는 DB 오류 상세(행의 값)를 담을 수 있어 종류만 남긴다.
            log.error("[RRNO] 재암호화 실패: {}", failure.getClass().getName());
            code = 1;
        }
        int finalCode = code;
        exit.accept(SpringApplication.exit(context, () -> finalCode));
    }
}
