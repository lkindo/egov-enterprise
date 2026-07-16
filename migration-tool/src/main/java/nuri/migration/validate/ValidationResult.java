package nuri.migration.validate;

import java.util.List;

/** 매핑 검증 결과. {@code errors} 가 있으면 이관을 중단한다. */
public record ValidationResult(List<String> errors, List<String> warnings) {

    public boolean ok() {
        return errors.isEmpty();
    }
}
