package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QIntegrationMessageItem is a Querydsl query type for IntegrationMessageItem
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIntegrationMessageItem extends EntityPathBase<IntegrationMessageItem> {

    private static final long serialVersionUID = -1690997193L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QIntegrationMessageItem integrationMessageItem = new QIntegrationMessageItem("integrationMessageItem");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final QIntegrationMessageItem_IntegrationMessageItemId id;

    public final NumberPath<Integer> itemLt = createNumber("itemLt", Integer.class);

    public final StringPath itemNm = createString("itemNm");

    public final StringPath itemType = createString("itemType");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath useAt = createString("useAt");

    public QIntegrationMessageItem(String variable) {
        this(IntegrationMessageItem.class, forVariable(variable), INITS);
    }

    public QIntegrationMessageItem(Path<? extends IntegrationMessageItem> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QIntegrationMessageItem(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QIntegrationMessageItem(PathMetadata metadata, PathInits inits) {
        this(IntegrationMessageItem.class, metadata, inits);
    }

    public QIntegrationMessageItem(Class<? extends IntegrationMessageItem> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QIntegrationMessageItem_IntegrationMessageItemId(forProperty("id")) : null;
    }

}

