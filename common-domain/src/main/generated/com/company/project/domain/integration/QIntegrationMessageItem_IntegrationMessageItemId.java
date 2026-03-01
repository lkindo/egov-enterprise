package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QIntegrationMessageItem_IntegrationMessageItemId is a Querydsl query type for IntegrationMessageItemId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QIntegrationMessageItem_IntegrationMessageItemId extends BeanPath<IntegrationMessageItem.IntegrationMessageItemId> {

    private static final long serialVersionUID = 1198362872L;

    public static final QIntegrationMessageItem_IntegrationMessageItemId integrationMessageItemId = new QIntegrationMessageItem_IntegrationMessageItemId("integrationMessageItemId");

    public final StringPath cntcMessageId = createString("cntcMessageId");

    public final StringPath itemId = createString("itemId");

    public QIntegrationMessageItem_IntegrationMessageItemId(String variable) {
        super(IntegrationMessageItem.IntegrationMessageItemId.class, forVariable(variable));
    }

    public QIntegrationMessageItem_IntegrationMessageItemId(Path<? extends IntegrationMessageItem.IntegrationMessageItemId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIntegrationMessageItem_IntegrationMessageItemId(PathMetadata metadata) {
        super(IntegrationMessageItem.IntegrationMessageItemId.class, metadata);
    }

}
