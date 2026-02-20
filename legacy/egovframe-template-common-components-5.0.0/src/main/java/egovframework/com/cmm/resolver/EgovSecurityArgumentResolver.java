package egovframework.com.cmm.resolver;

import java.util.Iterator;

import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Map????곸슜 ?뚮씪誘명꽣 蹂듯샇?붾? ?꾪븳 Custom ArgumentResolver ?대옒??
 * 
 * @author ?쒖??꾨젅?꾩썙?ы? ?댁궪??
 * @since 2024.07.09
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??       ?섏젙?댁슜
 *  ----------     --------    ---------------------------
 *  2024.07.09     ?좎슜??       Map ??낆뿉??noteId 蹂듯샇???곸슜???꾪븳 ArgumentResolver 異붽?
 *
 *      </pre>
 */

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
