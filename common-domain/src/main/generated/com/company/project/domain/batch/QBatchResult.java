package com.company.project.domain.batch;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBatchResult is a Querydsl query type for BatchResult
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBatchResult extends EntityPathBase<BatchResult> {

    private static final long serialVersionUID = 1264724684L;

    public static final QBatchResult batchResult = new QBatchResult("batchResult");

    public final StringPath batchOpertId = createString("batchOpertId");

    public final StringPath batchResultId = createString("batchResultId");

    public final StringPath batchSchdulId = createString("batchSchdulId");

    public final StringPath errorInfo = createString("errorInfo");

    public final StringPath executBeginTime = createString("executBeginTime");

    public final StringPath executEndTime = createString("executEndTime");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath paramtr = createString("paramtr");

    public final StringPath sttus = createString("sttus");

    public QBatchResult(String variable) {
        super(BatchResult.class, forVariable(variable));
    }

    public QBatchResult(Path<? extends BatchResult> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBatchResult(PathMetadata metadata) {
        super(BatchResult.class, metadata);
    }

}