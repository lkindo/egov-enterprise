package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QIntegrationService_IntegrationServiceId is a Querydsl query type for IntegrationServiceId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QIntegrationService_IntegrationServiceId extends BeanPath<IntegrationService.IntegrationServiceId> {

    private static final long serialVersionUID = 549452824L;

    public static final QIntegrationService_IntegrationServiceId integrationServiceId = new QIntegrationService_IntegrationServiceId("integrationServiceId");

    public final StringPath insttId = createString("insttId");

    public final StringPath svcId = createString("svcId");

    public final StringPath sysId = createString("sysId");

    public QIntegrationService_IntegrationServiceId(String variable) {
        super(IntegrationService.IntegrationServiceId.class, forVariable(variable));
    }

    public QIntegrationService_IntegrationServiceId(Path<? extends IntegrationService.IntegrationServiceId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIntegrationService_IntegrationServiceId(PathMetadata metadata) {
        super(IntegrationService.IntegrationServiceId.class, metadata);
    }

}
