package egovframework.com.cmm.context;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.service.EgovProperties;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;

/**
 * EgovWebServletContextListener ?대옒??
 * <Notice>
 * 	    ?곗씠?곕쿋?댁뒪 ?ㅼ젙??spring.profiles.active 諛⑹떇?쇰줈 泥섎━
 * 		(怨듯넻而댄룷?뚰듃 ?뱀꽦???곗씠?곕쿋?댁뒪蹂?遺꾨━/媛쒕컻,寃利??댁쁺?쒕쾭濡?遺꾨━ 媛??
 * <Disclaimer>
 *		N/A
 *
 * @author ?λ룞??
 * @since 2016.06.23
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??       ?섏젙??          ?섏젙?댁슜
 *  -------      -------------  ----------------------
 *   2016.06.23  ?λ룞??          理쒖큹 ?앹꽦
 *   2017.03.03     議곗꽦??	?쒗걧?댁퐫??ES)-?ㅻ쪟 硫붿떆吏瑜??듯븳 ?뺣낫?몄텧[CWE-209]
 * </pre>
 */

public class EgovWebServletContextListener implements ServletContextListener {
    private static final Logger LOGGER = LoggerFactory.getLogger(EgovWebServletContextListener.class);

    public EgovWebServletContextListener(){
    	setEgovProfileSetting();
    }

    @Override
	public void contextInitialized(ServletContextEvent event){
    	if(System.getProperty("spring.profiles.active") == null){
    		setEgovProfileSetting();
    	}
    }

    @Override
	public void contextDestroyed(ServletContextEvent event) {
    	if(System.getProperty("spring.profiles.active") != null){
    		System.clearProperty("spring.profiles.active");
    	}
    }

    public void setEgovProfileSetting(){
        try {
            LOGGER.debug("===========================Start EgovServletContextLoad START ===========");
            System.setProperty("spring.profiles.active", EgovProperties.getProperty("Globals.DbType")+","+EgovProperties.getProperty("Globals.Auth"));
            LOGGER.debug("Setting spring.profiles.active>"+System.getProperty("spring.profiles.active"));
            LOGGER.debug("===========================END   EgovServletContextLoad END ===========");
        //2017.03.03 	議곗꽦??	?쒗걧?댁퐫??ES)-?ㅻ쪟 硫붿떆吏瑜??듯븳 ?뺣낫?몄텧[CWE-209]
        } catch(IllegalArgumentException e) {
    		LOGGER.error("[IllegalArgumentException] Try/Catch...usingParameters Runing : "+ e.getMessage());
        } catch (RuntimeException e) {
        	LOGGER.error("[" + e.getClass() +"] search fail : " + e.getMessage());
        }
    }
}
