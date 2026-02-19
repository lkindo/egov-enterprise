package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QServerEqpmnRelate is a Querydsl query type for ServerEqpmnRelate
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QServerEqpmnRelate extends EntityPathBase<ServerEqpmnRelate> {

    private static final long serialVersionUID = 257815667L;

    public static final QServerEqpmnRelate serverEqpmnRelate = new QServerEqpmnRelate("serverEqpmnRelate");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath serverEqpmnId = createString("serverEqpmnId");

    public final StringPath serverId = createString("serverId");

    public QServerEqpmnRelate(String variable) {
        super(ServerEqpmnRelate.class, forVariable(variable));
    }

    public QServerEqpmnRelate(Path<? extends ServerEqpmnRelate> path) {
        super(path.getType(), path.getMetadata());
    }

    public QServerEqpmnRelate(PathMetadata metadata) {
        super(ServerEqpmnRelate.class, metadata);
    }

}

