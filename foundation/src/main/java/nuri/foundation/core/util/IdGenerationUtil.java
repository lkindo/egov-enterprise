package nuri.foundation.core.util;

import nuri.foundation.constants.Constants;
import java.util.UUID;

/**
 * 고유 ID 생성을 위한 통합 유틸리티 클래스
 */
public class IdGenerationUtil {

    /**
     * 지정된 접두사와 UUID를 조합하여 고유 ID를 생성합니다.
     * 
     * @param prefix ID 접두사
     * @param length UUID에서 추출할 길이
     * @return 생성된 고유 ID
     */
    public static String generateId(String prefix, int length) {
        return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, length).toUpperCase();
    }

    /**
     * 사용자용 고유 ID(EsntlId)를 생성합니다.
     */
    public static String generateUserId() {
        return generateId(Constants.User.USER_PREFIX, Constants.User.UUID_LENGTH);
    }

    /**
     * 일반 회원용 고유 ID(EsntlId)를 생성합니다.
     */
    public static String generateMberId() {
        return generateId(Constants.User.MBER_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }

    /**
     * 비정형 결재용 고유 ID를 생성합니다.
     */
    public static String generateInformalSanctionId() {
        return generateId(Constants.User.INFRML_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }
    /**
     * SMS 발송용 고유 ID를 생성합니다.
     */
    public static String generateSmsId() {
        return generateId(Constants.User.SMS_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }
    /**
     * 메일 발송용 고유 ID를 생성합니다.
     */
    public static String generateMailId() {
        return generateId(Constants.User.MAIL_PREFIX, Constants.User.ESNTL_ID_UUID_LENGTH);
    }
}
