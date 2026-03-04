package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QServer is a Querydsl query type for Server
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QServer extends EntityPathBase<Server> {

    private static final long serialVersionUID = 1386073131L;

    public static final QServer server = new QServer("server");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final DatePath<java.time.LocalDate> regstYmd = createDate("regstYmd", java.time.LocalDate.class);

    public final StringPath serverId = createString("serverId");

    public final StringPath serverKnd = createString("serverKnd");

    public final StringPath serverNm = createString("serverNm");

    public QServer(String variable) {
        super(Server.class, forVariable(variable));
    }

    public QServer(Path<? extends Server> path) {
        super(path.getType(), path.getMetadata());
    }

    public QServer(PathMetadata metadata) {
        super(Server.class, metadata);
    }

}
