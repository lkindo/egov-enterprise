package com.company.project.domain.batch;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBatchSchdul is a Querydsl query type for BatchSchdul
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBatchSchdul extends EntityPathBase<BatchSchdul> {

    private static final long serialVersionUID = 1291163026L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBatchSchdul batchSchdul = new QBatchSchdul("batchSchdul");

    public final QBatchOpert batchOpert;

    public final ListPath<BatchSchdulDfk, QBatchSchdulDfk> batchSchdulDfks = this.<BatchSchdulDfk, QBatchSchdulDfk>createList("batchSchdulDfks", BatchSchdulDfk.class, QBatchSchdulDfk.class, PathInits.DIRECT2);

    public final StringPath batchSchdulId = createString("batchSchdulId");

    public final StringPath executCycle = createString("executCycle");

    public final StringPath executSchdulDe = createString("executSchdulDe");

    public final StringPath executSchdulHour = createString("executSchdulHour");

    public final StringPath executSchdulMnt = createString("executSchdulMnt");

    public final StringPath executSchdulSecnd = createString("executSchdulSecnd");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public QBatchSchdul(String variable) {
        this(BatchSchdul.class, forVariable(variable), INITS);
    }

    public QBatchSchdul(Path<? extends BatchSchdul> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBatchSchdul(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBatchSchdul(PathMetadata metadata, PathInits inits) {
        this(BatchSchdul.class, metadata, inits);
    }

    public QBatchSchdul(Class<? extends BatchSchdul> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.batchOpert = inits.isInitialized("batchOpert") ? new QBatchOpert(forProperty("batchOpert")) : null;
    }

}
