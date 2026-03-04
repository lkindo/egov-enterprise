package com.company.project.domain.batch;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBatchOpert is a Querydsl query type for BatchOpert
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBatchOpert extends EntityPathBase<BatchOpert> {

    private static final long serialVersionUID = 1423814487L;

    public static final QBatchOpert batchOpert = new QBatchOpert("batchOpert");

    public final StringPath batchOpertId = createString("batchOpertId");

    public final StringPath batchOpertNm = createString("batchOpertNm");

    public final StringPath batchProgrm = createString("batchProgrm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath paramtr = createString("paramtr");

    public final StringPath useAt = createString("useAt");

    public QBatchOpert(String variable) {
        super(BatchOpert.class, forVariable(variable));
    }

    public QBatchOpert(Path<? extends BatchOpert> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBatchOpert(PathMetadata metadata) {
        super(BatchOpert.class, metadata);
    }

}