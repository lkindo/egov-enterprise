package nuri.foundation.core.annotation;

import java.lang.annotation.*;

/** Marks a sensitive mutation whose attempt and HTTP outcome accompany its transactional audit. */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface SensitiveOperation {
    String value();
}
