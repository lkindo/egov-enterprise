package com.company.project.domain.program;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QProgramChangeRequest is a Querydsl query type for ProgramChangeRequest
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProgramChangeRequest extends EntityPathBase<ProgramChangeRequest> {

    private static final long serialVersionUID = -934220132L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QProgramChangeRequest programChangeRequest = new QProgramChangeRequest("programChangeRequest");

    public final StringPath changeRequstCn = createString("changeRequstCn");

    public final QProgramChangeRequest_ProgramChangeRequestId id;

    public final StringPath opetrId = createString("opetrId");

    public final DatePath<java.time.LocalDate> processDe = createDate("processDe", java.time.LocalDate.class);

    public final StringPath processStatusCode = createString("processStatusCode");

    public final StringPath requstProcessCn = createString("requstProcessCn");

    public final StringPath requstSj = createString("requstSj");

    public final DatePath<java.time.LocalDate> rqestDe = createDate("rqestDe", java.time.LocalDate.class);

    public final StringPath rqesterId = createString("rqesterId");

    public QProgramChangeRequest(String variable) {
        this(ProgramChangeRequest.class, forVariable(variable), INITS);
    }

    public QProgramChangeRequest(Path<? extends ProgramChangeRequest> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QProgramChangeRequest(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QProgramChangeRequest(PathMetadata metadata, PathInits inits) {
        this(ProgramChangeRequest.class, metadata, inits);
    }

    public QProgramChangeRequest(Class<? extends ProgramChangeRequest> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QProgramChangeRequest_ProgramChangeRequestId(forProperty("id")) : null;
    }

}

