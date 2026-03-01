package egovframework.com.cmm.aop;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * EgovAdviceBasePathSecurityValidator Class 援ы쁽
 * @author ?쒖??꾨젅?꾩썙???좎슜??
 * @since 2019.04.25
 * @version 4.3
 * @see
 * <pre>
 *
 *  ?섏젙??        ?섏젙??         ?섏젙?댁슜
 *  ----------   -----------   ---------------------------
 *  2025.04.01   ?좎슜??         理쒖큹 ?앹꽦
 *
 *  - String basePath ?뚮씪誘명꽣?????AOP瑜??댁슜?섏뿬 蹂댁븞媛뺥솕 泥댄겕瑜??쒕떎.
 *  - 蹂댁븞?깆쓣 ?꾪빐 basePath??ROOT Path瑜?吏?뺥븷???녿떎.
 *  - basePath??????ㅼ쓬 寃쎈줈媛 異붽??섏뼱 ?붿씠?몃━?ㅽ듃 諛⑹떇?쇰줈 ?먭??쒕떎. (?꾩슂???붿씠?몃━?ㅽ듃瑜?異붽??쒕떎)
 *    basePath媛 ?ㅼ쓬 ?쒗븳??寃쎈줈???섏쐞???꾩튂?섎뒗吏 ?먭??쒕떎.
 *    1) Globals.fileStorePath # ?뚯씪 ?낅줈??寃쎈줈
 *    2) Globals.SynchrnServerPath # ?뚯씪 ?숆린??而댄룷?뚰듃?먯꽌 ?ъ슜???뚯씪 ?낅줈??寃쎈줈
 *
 */

public class EgovAdviceBasePathSecurityValidator {

	private static final Logger log = LoggerFactory.getLogger(EgovAdviceBasePathSecurityValidator.class);

	public void beforeTargetMethod(JoinPoint thisJoinPoint) {
    	log.debug(" * AdviceBasePathValidator > beforeTargetMethod executed.");

        @SuppressWarnings("unused")
		Class<? extends Object> clazz = thisJoinPoint.getTarget().getClass();
        String className = thisJoinPoint.getTarget().getClass().getSimpleName();
        String methodName = thisJoinPoint.getSignature().getName();

        // ?꾩옱
                    , method ?뺣낫 諛?method arguments 濡쒓퉭
        log.debug("==> {}.{}()", className, methodName);

        // 硫붿꽌???뚮씪誘명꽣 ?대쫫 媛?몄삤湲?
        MethodSignature methodSignature = (MethodSignature) thisJoinPoint.getSignature();
        String[] parameterNames = methodSignature.getParameterNames();

        Object[] arguments = thisJoinPoint.getArgs();
        int argCount = 0;
        for (Object obj : arguments) {
        	String paramName = (parameterNames != null && argCount < parameterNames.length) ? parameterNames[argCount] : "arg" + argCount;

        	log.debug(" - arg {} = {} : {} ", argCount, paramName, ToStringBuilder.reflectionToString(obj));
        	argCount++;
            // commons-lang ??ToStringBuilder瑜??듯빐(reflection ???댁슜)??VO ?뺣낫 異쒕젰

        	if (obj instanceof String) {

        	    log.debug(" - {} = \"{}\"", paramName, obj);
        		if ( "basePath".equals(paramName) ) {
        			if (!EgovFileBasePathSecurityValidator.validate(obj.toString())) {
        				throw new SecurityException("Unacceptable base path : " + obj);
        			}
        		}

        	} else {
                // commons-lang ??ToStringBuilder瑜??듯빐(reflection ???댁슜)??VO ?뺣낫 異쒕젰
        	    log.debug(" - {} = {}", paramName, ToStringBuilder.reflectionToString(obj));
        	}

        }

    }

}
