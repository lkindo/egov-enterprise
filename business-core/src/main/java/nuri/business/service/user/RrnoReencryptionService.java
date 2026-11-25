package nuri.business.service.user;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;

import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.RrnoEncryptionConverter;
import nuri.business.domain.common.RrnoKeyring;
import nuri.foundation.core.util.CryptoUtil;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 저장된 주민등록번호를 지금 활성 키의 v2 키링 암호문으로 다시 쓴다(2026-11-25, 품질 평가 개선 과제 3).
 *
 * <p>대상은 활성 키로 쓴 v2 봉투가 <b>아닌</b> 모든 값이다 — 종전 ARIA 암호문(IV·MAC 없는 결정적 암호라 같은 번호가 같은 암호문이 되고
 * 변조를 알 수 없다), 과거 평문, 이전 키의 v2 봉투(키 교체).
 *
 * <p><b>두 단계로 돈다.</b> ① 판독: 모든 행을 읽어 값마다 원문을 하나로 정한다 — 활성 키 봉투도 풀어 키가 맞는지 확인한다. 하나라도
 * 정하지 못하면 아무것도 쓰지 않고 멈춘다(점검·적용 모두). ② 적용(apply 일 때만): 다시 읽은 값마다 다시 판독해 대상 값을 활성 키로
 * 다시 쓴다. 판독 뒤 다른 쓰기가 값을 정할 수 없게 바꿨으면 그 자리에서 멈춘다 — 그 앞에서 다시 쓴 행은 판독한 원문을 쓴 것이다.
 *
 * <p><b>원문을 하나로 정하는 규칙</b>(2026-11-25 Codex 검토): v2 봉투는 인증 암호라 키가 틀리면 예외다. ARIA 는 다른 키로 풀어도
 * 예외 없이 엉뚱한 바이트를 돌려줄 수 있어, 키 교체 중(ALGORITHM_KEY·OLD_ALGORITHM_KEY 둘 다)에는 현재 키와 이전 키로 각각 풀고
 * 주민등록번호 꼴인 결과가 정확히 하나일 때만 그 값을 쓴다 — 둘이면 어느 키의 값인지 알 수 없으므로 멈춘다. 둘 다 아니면 과거 평문인지
 * 보고, 그것도 아니면 멈춘다.
 *
 * <p>동시성: 읽은 암호문이 그대로일 때만 바꾸는 조건부 UPDATE 다. 그 사이 앱이 그 행을 고쳤으면 건너뛰고 센다(다음 실행이 다시 본다).
 * 행마다 자동 커밋이라 중간에 멈춰도 다시 돌리면 남은 행부터 잇는다. 페이징은 키셋({@code esntl_id >})과
 * {@link PreparedStatement#setMaxRows} 라 벤더 고유 구문이 없고, 첫 쪽은 커서 조건 없이 읽는다(빈 문자열을 NULL 로 다루는 벤더 대비).
 *
 * <p>로그·예외 메시지에는 건수와 행 참조({@link #rowRef} — 식별자의 digest)만 남기고 식별자 원문·값(암호문·평문)·DB 오류 원문은
 * 남기지 않는다.
 */
@Slf4j
@Service
public class RrnoReencryptionService {

    static final int CHUNK = 200;
    private static final int MAX_REPORTED_IDS = 20;

    private static final String SELECT_FIRST_PAGE =
            "SELECT esntl_id, user_enrrno FROM tb_user_info WHERE user_enrrno IS NOT NULL ORDER BY esntl_id";
    private static final String SELECT_NEXT_PAGE =
            "SELECT esntl_id, user_enrrno FROM tb_user_info WHERE esntl_id > ? AND user_enrrno IS NOT NULL ORDER BY esntl_id";
    private static final String UPDATE_IF_UNCHANGED =
            "UPDATE tb_user_info SET user_enrrno = ? WHERE esntl_id = ? AND user_enrrno = ?";

    private final JdbcTemplate jdbcTemplate;

    public RrnoReencryptionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * @param targets          활성 키가 아닌 값의 수(빈 값은 세지 않는다)
     * @param rewritten        다시 쓴 행 수(apply 일 때만)
     * @param changedMeanwhile 판독 뒤 다른 쓰기가 먼저 바꿔 건너뛴 행 수
     */
    public record Result(long targets, long rewritten, long changedMeanwhile, boolean applied) {
    }

    /** 재암호화가 멈춘 이유. 메시지에는 건수·행 식별자만 담는다(값·DB 오류 원문 없음). */
    public static final class ReencryptionStopped extends IllegalStateException {
        public ReencryptionStopped(String message) {
            super(message);
        }
    }

    /**
     * @param apply false 면 판독만 하고 대상 수를 센다(점검). true 면 판독이 모두 성공한 뒤에만 다시 쓴다.
     * @throws ReencryptionStopped 키링이 없거나, 원문을 하나로 정하지 못한 행이 있거나, 쓰기가 DB 오류로 실패했을 때
     */
    public Result run(boolean apply) {
        if (!RrnoKeyring.active()) {
            throw new ReencryptionStopped("Rrno keyring is not configured — set RRNO_ACTIVE_KEY_ID and RRNO_KEYS_JSON before re-encryption");
        }
        long targets = verifyAll();
        if (!apply) {
            log.info("[RRNO] 재암호화 점검(dry-run) — 모든 값 판독 성공, 대상 {}건", targets);
            return new Result(targets, 0, 0, false);
        }
        long rewritten = 0;
        long changedMeanwhile = 0;
        String after = null;
        while (true) {
            List<StoredValue> page = page(after);
            if (page.isEmpty()) {
                break;
            }
            for (StoredValue stored : page) {
                if (stored.value().isBlank()) {
                    continue;
                }
                // 적용 단계도 다시 읽은 값마다 판독한다 — 판독 단계 뒤 다른 쓰기가 값을 바꿨을 수 있다(활성 키 봉투도 풀어 본다).
                // 정하지 못하면 그 자리에서 멈춘다(종료 코드 1). 앞서 다시 쓴 행은 판독한 원문을 쓴 것이라 올바르다(2026-11-25 Codex 2차).
                String plaintext = resolvePlaintext(stored.value());
                if (plaintext == null) {
                    throw new ReencryptionStopped("Rrno re-encryption stopped while writing: a value changed after verification and cannot be "
                            + "resolved to exactly one plaintext (row " + rowRef(stored.esntlId()) + "). Rows rewritten before it hold "
                            + "verified plaintexts — judge that row, then re-run.");
                }
                if (RrnoKeyring.isActiveKeyEnvelope(stored.value())) {
                    continue;
                }
                int updated;
                try {
                    updated = jdbcTemplate.update(UPDATE_IF_UNCHANGED, RrnoKeyring.encrypt(plaintext), stored.esntlId(), stored.value());
                } catch (DataAccessException failure) {
                    throw new ReencryptionStopped("Rrno re-encryption stopped: update failed (row " + rowRef(stored.esntlId())
                            + ", " + failure.getClass().getSimpleName() + "). Rows before it are already committed — re-run after fixing.");
                }
                if (updated == 1) {
                    rewritten++;
                } else {
                    changedMeanwhile++;
                }
            }
            after = page.getLast().esntlId();
        }
        log.info("[RRNO] 재암호화 적용 — 대상 {}건, 다시 씀 {}건, 그 사이 바뀌어 건너뜀 {}건", targets, rewritten, changedMeanwhile);
        return new Result(targets, rewritten, changedMeanwhile, true);
    }

    /** ① 판독 단계: 모든 값을 풀어 본다. 하나라도 정하지 못하면 행 식별자를 모아 멈춘다. 활성 키가 아닌 값의 수를 돌려준다. */
    private long verifyAll() {
        long targets = 0;
        long unreadable = 0;
        List<String> reported = new ArrayList<>();
        String after = null;
        while (true) {
            List<StoredValue> page = page(after);
            if (page.isEmpty()) {
                break;
            }
            for (StoredValue stored : page) {
                if (stored.value().isBlank()) {
                    continue;
                }
                boolean activeEnvelope = RrnoKeyring.isActiveKeyEnvelope(stored.value());
                if (!activeEnvelope) {
                    targets++;
                }
                if (resolvePlaintext(stored.value()) == null) {
                    unreadable++;
                    if (reported.size() < MAX_REPORTED_IDS) {
                        reported.add(rowRef(stored.esntlId()));
                    }
                }
            }
            after = page.getLast().esntlId();
        }
        if (unreadable > 0) {
            throw new ReencryptionStopped("Rrno re-encryption stopped before writing: " + unreadable
                    + " stored value(s) cannot be resolved to exactly one plaintext (row refs " + reported
                    + (unreadable > reported.size() ? " …" : "") + "). Check RRNO_KEYS_JSON (keep previous v2 keys), "
                    + "ALGORITHM_KEY/OLD_ALGORITHM_KEY, then judge those rows before re-running.");
        }
        return targets;
    }

    /**
     * 로그·예외에 남기는 행 참조 — {@code esntl_id} 의 UTF-8 SHA-256 앞 16자(16진수). 런북 §4.1 의 '대상 PK 의 비식별 digest' 다.
     * 운영자는 런북 §7.3 의 질의로 이 값을 행으로 되짚는다.
     */
    static String rowRef(String esntlId) {
        try {
            byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(esntlId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash).substring(0, 16);
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    /** 저장 값의 원문을 하나로 정한다. 정하지 못하면 null(값을 로그에 남기지 않는다). */
    static String resolvePlaintext(String stored) {
        if (RrnoKeyring.isEnvelope(stored)) {
            try {
                String plaintext = RrnoKeyring.decrypt(stored);
                return RrnoEncryptionConverter.isRrnoFormat(plaintext) ? plaintext : null;
            } catch (RuntimeException wrongOrMissingKey) {
                return null;
            }
        }
        List<String> valid = CryptoUtil.decryptCandidates(stored).stream()
                .filter(RrnoEncryptionConverter::isRrnoFormat)
                .distinct()
                .toList();
        if (valid.size() == 1) {
            return valid.getFirst();
        }
        if (valid.size() > 1) {
            return null; // 현재·이전 키가 서로 다른 주민번호 꼴을 낸다 — 어느 키의 값인지 알 수 없다
        }
        return RrnoEncryptionConverter.isRrnoFormat(stored) ? stored : null; // 과거 평문
    }

    private List<StoredValue> page(String after) {
        return jdbcTemplate.query(connection -> {
            PreparedStatement statement = connection.prepareStatement(after == null ? SELECT_FIRST_PAGE : SELECT_NEXT_PAGE);
            if (after != null) {
                statement.setString(1, after);
            }
            statement.setMaxRows(CHUNK);
            return statement;
        }, (rs, rowNum) -> new StoredValue(rs.getString(1), rs.getString(2)));
    }

    private record StoredValue(String esntlId, String value) {
    }
}
