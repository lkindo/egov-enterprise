package com.company.project.domain.batch;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBatchSchdulDfkId is a Querydsl query type for BatchSchdulDfkId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QBatchSchdulDfkId extends BeanPath<BatchSchdulDfkId> {

    private static final long serialVersionUID = -1018082126L;

    public static final QBatchSchdulDfkId batchSchdulDfkId = new QBatchSchdulDfkId("batchSchdulDfkId");

    public final StringPath batchSchdulId = createString("batchSchdulId");

    public final StringPath executSchdulDfkSe = createString("executSchdulDfkSe");

    public QBatchSchdulDfkId(String variable) {
        super(BatchSchdulDfkId.class, forVariable(variable));
    }

    public QBatchSchdulDfkId(Path<? extends BatchSchdulDfkId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBatchSchdulDfkId(PathMetadata metadata) {
        super(BatchSchdulDfkId.class, metadata);
    }

}
