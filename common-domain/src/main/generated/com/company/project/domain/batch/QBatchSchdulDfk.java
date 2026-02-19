package com.company.project.domain.batch;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBatchSchdulDfk is a Querydsl query type for BatchSchdulDfk
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBatchSchdulDfk extends EntityPathBase<BatchSchdulDfk> {

    private static final long serialVersionUID = -689326793L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBatchSchdulDfk batchSchdulDfk = new QBatchSchdulDfk("batchSchdulDfk");

    public final QBatchSchdul batchSchdul;

    public final QBatchSchdulDfkId id;

    public QBatchSchdulDfk(String variable) {
        this(BatchSchdulDfk.class, forVariable(variable), INITS);
    }

    public QBatchSchdulDfk(Path<? extends BatchSchdulDfk> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBatchSchdulDfk(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBatchSchdulDfk(PathMetadata metadata, PathInits inits) {
        this(BatchSchdulDfk.class, metadata, inits);
    }

    public QBatchSchdulDfk(Class<? extends BatchSchdulDfk> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.batchSchdul = inits.isInitialized("batchSchdul") ? new QBatchSchdul(forProperty("batchSchdul"), inits.get("batchSchdul")) : null;
        this.id = inits.isInitialized("id") ? new QBatchSchdulDfkId(forProperty("id")) : null;
    }

}

