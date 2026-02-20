package egovframework.com.cmm.aop;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * EgovAdviceBasePathSecurityValidator Class ?
 * @author ??????????
 * @since 2019.04.25
 * @version 4.3
 * @see
 * <pre>
 *
 *  ????        ????         ????
 *  ----------   -----------   ---------------------------
 *  2025.04.01   ???         ????
 *
 *  - String basePath ?????????AOP??????  ???.
 *  - ? ? basePath??ROOT Path???????.
 *  - basePath???????? ? ???? ???? ??? ????. (?????????????)
 *    basePath ?? ????????????? ????.
 *    1) Globals.fileStorePath # ??? ?????
 *    2) Globals.SynchrnServerPath # ??? ????????? ???????? ?????
 *
 **/

public class EgovAdviceBasePathSecurityValidator {

	private static final Logger log = LoggerFactory.getLogger(EgovAdviceBasePathSecurityValidator.class);

	public void beforeTargetMethod(JoinPoint thisJoinPoint) {
    	log.debug(" * AdviceBasePathValidator > beforeTargetMethod executed.");

        @SuppressWarnings("unused")
		Class<? extends Object> clazz = thisJoinPoint.getTarget().getClass();
        String className = thisJoinPoint.getTarget().getClass().getSimpleName();
        String methodName = thisJoinPoint.getSignature().getName();

        // ? class, method ? ?method arguments ??
        log.debug("==> {}.{}()", className, methodName);

        // ???????????
        MethodSignature methodSignature = (MethodSignature) thisJoinPoint.getSignature();
        String[] parameterNames = methodSignature.getParameterNames();

        Object[] arguments = thisJoinPoint.getArgs();
        int argCount = 0;
        for (Object obj : arguments) {
        	String paramName = (parameterNames != null && argCount < parameterNames.length) ? parameterNames[argCount] : "arg" + argCount;

        	log.debug(" - arg {} = {} : {} ", argCount, paramName, ToStringBuilder.reflectionToString(obj));
        	argCount++;
            // commons-lang ??ToStringBuilder?????(reflection ????)??VO ? ???

        	if (obj instanceof String) {

        	    log.debug(" - {} = \"{}\"", paramName, obj);
        		if ( "basePath".equals(paramName) ) {
        			if (!EgovFileBasePathSecurityValidator.validate(obj.toString())) {
        				throw new SecurityException("Unacceptable base path : " + obj);
        			}
        		}

        	} else {
                // commons-lang ??ToStringBuilder?????(reflection ????)??VO ? ???
        	    log.debug(" - {} = {}", paramName, ToStringBuilder.reflectionToString(obj));
        	}

        }

    }

}
