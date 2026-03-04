package com.company.project.domain.consult;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QCnsltManage is a Querydsl query type for CnsltManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCnsltManage extends EntityPathBase<CnsltManage> {

    private static final long serialVersionUID = -770326340L;

    public static final QCnsltManage cnsltManage = new QCnsltManage("cnsltManage");

    public final StringPath areaNo = createString("areaNo");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath cnsltCn = createString("cnsltCn");

    public final StringPath cnsltId = createString("cnsltId");

    public final StringPath cnsltSj = createString("cnsltSj");

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath emailAnswerAt = createString("emailAnswerAt");

    public final StringPath endMbtlnum = createString("endMbtlnum");

    public final StringPath endTelno = createString("endTelno");

    public final StringPath firstMoblphonNo = createString("firstMoblphonNo");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final NumberPath<Integer> inqireCo = createNumber("inqireCo", Integer.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath managtCn = createString("managtCn");

    public final StringPath managtDe = createString("managtDe");

    public final StringPath middleMbtlnum = createString("middleMbtlnum");

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath othbcAt = createString("othbcAt");

    public final StringPath qnaProcessSttusCode = createString("qnaProcessSttusCode");

    public final StringPath writngDe = createString("writngDe");

    public final StringPath writngPassword = createString("writngPassword");

    public final StringPath wrterNm = createString("wrterNm");

    public QCnsltManage(String variable) {
        super(CnsltManage.class, forVariable(variable));
    }

    public QCnsltManage(Path<? extends CnsltManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCnsltManage(PathMetadata metadata) {
        super(CnsltManage.class, metadata);
    }

}
