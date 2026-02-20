package com.company.project.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QUserLog is a Querydsl query type for UserLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUserLog extends EntityPathBase<UserLog> {

    private static final long serialVersionUID = -462756584L;

    public static final QUserLog userLog = new QUserLog("userLog");

    public final NumberPath<Integer> creatCo = createNumber("creatCo", Integer.class);

    public final NumberPath<Integer> deleteCo = createNumber("deleteCo", Integer.class);

    public final NumberPath<Integer> errorCo = createNumber("errorCo", Integer.class);

    public final StringPath methodNm = createString("methodNm");

    public final StringPath occrrncDe = createString("occrrncDe");

    public final NumberPath<Integer> outptCo = createNumber("outptCo", Integer.class);

    public final NumberPath<Integer> rdCnt = createNumber("rdCnt", Integer.class);

    public final StringPath rqesterId = createString("rqesterId");

    public final StringPath srvcNm = createString("srvcNm");

    public final NumberPath<Integer> updtCo = createNumber("updtCo", Integer.class);

    public QUserLog(String variable) {
        super(UserLog.class, forVariable(variable));
    }

    public QUserLog(Path<? extends UserLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUserLog(PathMetadata metadata) {
        super(UserLog.class, metadata);
    }

}

