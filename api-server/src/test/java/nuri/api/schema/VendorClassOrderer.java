package nuri.api.schema;

import java.util.Comparator;
import org.junit.jupiter.api.ClassDescriptor;
import org.junit.jupiter.api.ClassOrderer;
import org.junit.jupiter.api.ClassOrdererContext;

/**
 * 벤더 실행의 클래스 순서(ADR-0047 D-10). 클래스들이 일회용 DB 하나를 같이 쓰는데, 권한 관리 시험은 시드의 관리자 배정과 메뉴 권한을
 * 걷어 낸 채 끝난다. 뒤따르는 시험이 그 상태를 밟지 않게 맨 뒤에 둔다. DB 는 실행이 끝나면 버린다.
 */
public final class VendorClassOrderer implements ClassOrderer {

    private static final String CHANGES_SEEDED_GRANTS = "AuthorizationAdministrationIntegrationTest";

    @Override
    public void orderClasses(ClassOrdererContext context) {
        context.getClassDescriptors().sort(Comparator.comparing(
                (ClassDescriptor descriptor) -> CHANGES_SEEDED_GRANTS.equals(descriptor.getTestClass().getSimpleName())));
    }
}
