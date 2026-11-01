package nuri.api.schema;

import java.sql.Connection;
import java.sql.SQLException;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

/**
 * 벤더 실행의 모든 시험 클래스 앞에서 DB 소유를 확인한다(ADR-0047 D-10). 스프링 문맥을 띄우기 전에 돌므로 소유를 확인하지 못한 DB 에는 어떤 시험도 쓰지 않는다.
 * {@code vendorIntegrationTest} 만 자동 등록을 켠다. 다른 시험 작업에서는 돌지 않는다.
 */
public final class VendorOwnershipExtension implements BeforeAllCallback {

    @Override
    public void beforeAll(ExtensionContext context) throws SQLException {
        if (!VendorTestSql.vendorRun()) {
            throw new IllegalStateException("벤더 시험은 실행 도구로 돌린다");
        }
        try (Connection connection = VendorTestSql.openVendorConnection()) {
            VendorTestSql.assertOwnedVendorDatabase(VendorTestSql.on(connection));
        }
    }
}
