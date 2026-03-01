package com.company.project.domain.qna;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QQna is a Querydsl query type for Qna
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QQna extends EntityPathBase<Qna> {

    private static final long serialVersionUID = -647144029L;

    public static final QQna qna = new QQna("qna");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath answerCn = createString("answerCn");

    public final StringPath answerDe = createString("answerDe");

    public final StringPath areaNo = createString("areaNo");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath emailAnswerAt = createString("emailAnswerAt");

    public final StringPath endTelno = createString("endTelno");

    public final NumberPath<Integer> inqireCo = createNumber("inqireCo", Integer.class);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath qaId = createString("qaId");

    public final StringPath qestnCn = createString("qestnCn");

    public final StringPath qestnSj = createString("qestnSj");

    public final StringPath qnaProcessSttusCode = createString("qnaProcessSttusCode");

    public final StringPath writngDe = createString("writngDe");

    public final StringPath writngPassword = createString("writngPassword");

    public final StringPath wrterNm = createString("wrterNm");

    public QQna(String variable) {
        super(Qna.class, forVariable(variable));
    }

    public QQna(Path<? extends Qna> path) {
        super(path.getType(), path.getMetadata());
    }

    public QQna(PathMetadata metadata) {
        super(Qna.class, metadata);
    }

}
