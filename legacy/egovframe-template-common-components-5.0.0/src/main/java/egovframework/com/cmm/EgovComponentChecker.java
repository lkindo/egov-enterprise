package egovframework.com.cmm;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;


/**
 * EgovComUtil ?대옒??
 *
 * @author ?쒖???
 * @since 2011.09.15
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    -------------    ----------------------
 *   2011.09.15  ?쒖???       理쒖큹 ?앹꽦
 * </pre>
 */

@Service("egovUtil")
public class EgovComponentChecker extends EgovAbstractServiceImpl implements ApplicationContextAware{


	public static ApplicationContext context;

	@Override
	@SuppressWarnings("static-access")
	public void setApplicationContext(ApplicationContext context)
		throws BeansException {

		EgovComponentChecker.context = context;
	}


	/**
	 * Spring MVC?먯꽌 ?ㅼ젙??鍮덉씠 ?꾨땶 ?쒕퉬??鍮?而댄룷?뚰듃)留뚯쓣 寃?됲븷 ???덉쓬
	 *
	*/
	public static boolean hasComponent(String componentName){

		try{
			Object component = context.getBean(componentName);

			// 221116	源?쒖?	2022 ?쒗걧?댁퐫??議곗튂
			if(ObjectUtils.isEmpty(component)){
				return false;
			}else{
				return true;
			}

		}catch(NoSuchBeanDefinitionException ex){// ?대떦 而댄룷?뚰듃瑜?李얠쓣 ?섏뾾??寃쎌슦 false諛섑솚
			return false;
		}
	}



}
