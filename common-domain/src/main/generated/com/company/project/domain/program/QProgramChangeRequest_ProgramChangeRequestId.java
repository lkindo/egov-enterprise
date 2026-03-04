package com.company.project.domain.program;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QProgramChangeRequest_ProgramChangeRequestId is a Querydsl query type for ProgramChangeRequestId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QProgramChangeRequest_ProgramChangeRequestId extends BeanPath<ProgramChangeRequest.ProgramChangeRequestId> {

    private static final long serialVersionUID = 230530760L;

    public static final QProgramChangeRequest_ProgramChangeRequestId programChangeRequestId = new QProgramChangeRequest_ProgramChangeRequestId("programChangeRequestId");

    public final StringPath progrmFileNm = createString("progrmFileNm");

    public final NumberPath<Long> requstNo = createNumber("requstNo", Long.class);

    public QProgramChangeRequest_ProgramChangeRequestId(String variable) {
        super(ProgramChangeRequest.ProgramChangeRequestId.class, forVariable(variable));
    }

    public QProgramChangeRequest_ProgramChangeRequestId(Path<? extends ProgramChangeRequest.ProgramChangeRequestId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProgramChangeRequest_ProgramChangeRequestId(PathMetadata metadata) {
        super(ProgramChangeRequest.ProgramChangeRequestId.class, metadata);
    }

}
