package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QServerEqpmn is a Querydsl query type for ServerEqpmn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QServerEqpmn extends EntityPathBase<ServerEqpmn> {

    private static final long serialVersionUID = 830700666L;

    public static final QServerEqpmn serverEqpmn = new QServerEqpmn("serverEqpmn");

    public final StringPath cpuInfo = createString("cpuInfo");

    public final StringPath etcInfo = createString("etcInfo");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath hdDisk = createString("hdDisk");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath moryInfo = createString("moryInfo");

    public final StringPath opersysmInfo = createString("opersysmInfo");

    public final DatePath<java.time.LocalDate> regstYmd = createDate("regstYmd", java.time.LocalDate.class);

    public final StringPath serverEqpmnId = createString("serverEqpmnId");

    public final StringPath serverEqpmnIp = createString("serverEqpmnIp");

    public final StringPath serverEqpmnMngr = createString("serverEqpmnMngr");

    public final StringPath serverEqpmnNm = createString("serverEqpmnNm");

    public QServerEqpmn(String variable) {
        super(ServerEqpmn.class, forVariable(variable));
    }

    public QServerEqpmn(Path<? extends ServerEqpmn> path) {
        super(path.getType(), path.getMetadata());
    }

    public QServerEqpmn(PathMetadata metadata) {
        super(ServerEqpmn.class, metadata);
    }

}
