package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QIntegrationSystem_IntegrationSystemId is a Querydsl query type for IntegrationSystemId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QIntegrationSystem_IntegrationSystemId extends BeanPath<IntegrationSystem.IntegrationSystemId> {

    private static final long serialVersionUID = 967343906L;

    public static final QIntegrationSystem_IntegrationSystemId integrationSystemId = new QIntegrationSystem_IntegrationSystemId("integrationSystemId");

    public final StringPath insttId = createString("insttId");

    public final StringPath sysId = createString("sysId");

    public QIntegrationSystem_IntegrationSystemId(String variable) {
        super(IntegrationSystem.IntegrationSystemId.class, forVariable(variable));
    }

    public QIntegrationSystem_IntegrationSystemId(Path<? extends IntegrationSystem.IntegrationSystemId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIntegrationSystem_IntegrationSystemId(PathMetadata metadata) {
        super(IntegrationSystem.IntegrationSystemId.class, metadata);
    }

}
