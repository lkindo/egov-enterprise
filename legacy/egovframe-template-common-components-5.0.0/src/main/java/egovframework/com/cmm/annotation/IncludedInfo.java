package egovframework.com.cmm.annotation;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

/**
 * IncludedInfo ?대옒??
 *
 * <p>
 * 而댄룷?뚰듃???ы븿 ?뺣낫 ?쒗쁽???꾪븳 annotation ?대옒??
 * 湲곕낯?곸쑝濡?Controller ?대옒?ㅼ뿉 annotation??遺?ы븯??
 * ?섎굹??Controller???щ윭 媛쒖쓽 紐⑸줉??url mapping???쒓났?섎뒗 寃쎌슦?먮뒗
 * 硫붿냼?쒖뿉 annotation??遺?ы븳??
 * </p>
 *
 * @author 怨듯넻而댄룷?뚰듃 ?뺤쭊??
 * @since 2011.08.26
 * @version 2.0.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??    ?섏젙??    ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2011.08.26  ?뺤쭊??        理쒖큹 ?앹꽦
 *
 * </pre>
 */


@Retention(RetentionPolicy.RUNTIME)
public @interface IncludedInfo {
	String name() default "";		// 而댄룷?뚰듃???쒓? ?대쫫
	String listUrl() default "";	// 而댄룷?뚰듃??紐⑸줉?뺣낫議고쉶瑜??꾪븳 URL
	int order() default 0;			// ?먮룞 ?앹꽦?섎뒗 硫붾돱 紐⑸줉???쒖떆?섎뒗 ?쒖꽌
	int gid() default 0;			// 而댄룷?뚰듃??Group ID(?遺꾨쪟 援щ텇)
}
