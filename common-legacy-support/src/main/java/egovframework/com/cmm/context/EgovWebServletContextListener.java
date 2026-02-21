package egovframework.com.cmm.context;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.service.EgovProperties;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;

/**
 * EgovWebServletContextListener ?????
 * <Notice>
 * 	    ???? ????spring.profiles.active ??? ??
 * 		(???? ???????????????????????
 * <Disclaimer>
 *		N A   
 *
 * @author ?      ??
 * @since 2016.06.23
 * @version 1.0
 * @see
 *
 * <pre>
 * <<          ???  ??Modification Information) >>
 *
 *   ??      ??       ??      ??          ??      ??      
 *  -------      -------------  ----------------------
 *   2016.06.23  ?      ??                   ????      
 *   2017.03.03                 ??	??      ??      ??ES)-??                ?      ??????    ?         ?         [CWE-209]
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
        //2017.03.03 	??	??????ES)-?? ??????? ??[CWE-209]
        } catch(IllegalArgumentException e) {
    		LOGGER.error("[IllegalArgumentException] Try/Catch...usingParameters Runing : "+ e.getMessage());
        } catch (RuntimeException e) {
        	LOGGER.error("[" + e.getClass() +"] search fail : " + e.getMessage());
        }
    }
}
