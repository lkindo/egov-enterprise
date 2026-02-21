package egovframework.com.cmm;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

/**
 * EgovComUtil ?????
 *
 * @author ?????
 * @since 2011.09.15
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    -------------    ----------------------
 *   2011.09.15  ?????       ????
 *      </pre>
 **/

@Service("egovUtil")
public class EgovComponentChecker extends EgovAbstractServiceImpl implements ApplicationContextAware {

	public static ApplicationContext context;

	@Override
	public void setApplicationContext(ApplicationContext context)
			throws BeansException {

		EgovComponentChecker.context = context;
	}

	/**
	 * Spring MVC?? ????????? ?????????)???? ????
	 *
	 **/
	public static boolean hasComponent(String componentName) {

		if (context.containsBean(componentName)) {
			Object component = context.getBean(componentName);

			// 221116 ??? 2022 ????????
			return !ObjectUtils.isEmpty(component);
		}

		return false;
	}

}
