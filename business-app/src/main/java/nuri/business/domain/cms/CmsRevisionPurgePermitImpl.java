package nuri.business.domain.cms;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.persistence.VendorSqlDialect;
import nuri.foundation.core.persistence.VendorSqlDialect.LedgerDeletionPermit;

@RequiredArgsConstructor
public class CmsRevisionPurgePermitImpl implements CmsRevisionPurgePermit {

    private final EntityManager entityManager;
    private final VendorSqlDialect vendorSql;

    @Override
    public void allowPurgeInCurrentTransaction() {
        vendorSql.permitLedgerDeletion(entityManager, LedgerDeletionPermit.CMS_PURGE);
    }
}
