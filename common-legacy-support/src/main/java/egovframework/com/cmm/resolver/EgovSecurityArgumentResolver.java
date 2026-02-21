package egovframework.com.cmm.resolver;

import java.util.Iterator;

import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Map????? ??????? ? Custom ArgumentResolver ?????
 * 
 * @author ???????? ????
 * @since 2024.07.09
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????         ????       ????
 *  ----------     --------    ---------------------------
 *  2024.07.09     ???       Map ??????noteId ??????? ArgumentResolver ??
 *
 *      </pre>
 **/

public class EgovSecurityArgumentResolver implements HandlerMethodArgumentResolver {

	@Override
	public boolean supportsParameter(MethodParameter parameter) {
		
		return EgovSecurityMap.class.isAssignableFrom(parameter.getParameterType());
	}
	
	@Override 
	public Object resolveArgument(MethodParameter parameter
									, ModelAndViewContainer mavContainer
									, NativeWebRequest webRequest
									, WebDataBinderFactory binderFactory) throws Exception {
		
		EgovSecurityMap securityMap = new EgovSecurityMap();
		for(Iterator<String> iterator = webRequest.getParameterNames(); iterator.hasNext();) {
			String key = iterator.next();
			securityMap.put(key, webRequest.getParameter(key));
		}
		return securityMap;
	}

}
