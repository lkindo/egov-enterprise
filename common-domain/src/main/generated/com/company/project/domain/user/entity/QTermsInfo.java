package com.company.project.domain.user.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTermsInfo is a Querydsl query type for TermsInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTermsInfo extends EntityPathBase<TermsInfo> {

    private static final long serialVersionUID = -485749418L;

    public static final QTermsInfo termsInfo = new QTermsInfo("termsInfo");

    public final StringPath infoProvdAgreCn = createString("infoProvdAgreCn");

    public final StringPath useStplatCn = createString("useStplatCn");

    public final StringPath useStplatId = createString("useStplatId");

    public QTermsInfo(String variable) {
        super(TermsInfo.class, forVariable(variable));
    }

    public QTermsInfo(Path<? extends TermsInfo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTermsInfo(PathMetadata metadata) {
        super(TermsInfo.class, metadata);
    }

}
