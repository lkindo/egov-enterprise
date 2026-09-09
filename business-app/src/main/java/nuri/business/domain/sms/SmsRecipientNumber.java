package nuri.business.domain.sms;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/** 수신번호의 저장·중복 제거·결과 조회에 사용하는 숫자 문자열 계약. */
public final class SmsRecipientNumber {
    private SmsRecipientNumber() {
    }

    /** 기존 하이픈 입력을 허용하되 다른 문자는 제거하지 않아 검증에서 거절한다. */
    public static String canonicalize(String value) {
        return value == null ? null : value.trim().replace("-", "");
    }

    public static String requireValid(String value) {
        String canonical = canonicalize(value);
        if (canonical == null || !canonical.matches("[0-9]{1,11}")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "수신 번호는 하이픈을 제외한 숫자 1~11자리로 입력해 주세요.");
        }
        return canonical;
    }
}
