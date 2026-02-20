package egovframework.com.utl.jso.web;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.service.EgovCmmUseService;
import jakarta.annotation.Resource;

/**
 * ?붿냼湲곗닠 json 愿??controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 2016 ?쒖??꾨젅?꾩썶???좎?蹂댁닔 ?λ룞??
 * @since 2016.07.14
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2016.07.14  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */


@Controller
public class EgovUtlJsonController {

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "EgovCmmUseService")
    EgovCmmUseService egovCmmUseService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovUtlJsonController.class);

    /**
	 * json ?④굔議고쉶
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/utl/jso/EgovUtlJsonInquire.do",method = RequestMethod.GET)
    public String selectUtlJsonInquire()  throws Exception {
        return "egovframework/com/utl/jso/EgovUtlJsonInquire";
    }

    @RequestMapping(value="/utl/jso/EgovUtlJsonInquire.do",method = RequestMethod.POST)
    public ModelAndView selectUtlJsonInquirePost(@RequestParam Map<?, ?> commandMap)  throws Exception {
    	ModelAndView modelAndView = new ModelAndView();
    	modelAndView.setViewName("jsonView");
    	LOGGER.debug("EgovUtlJsonController EgovUtlJsonInquire START=========");

    	LOGGER.debug("commandMap>"+commandMap);

    	modelAndView.addObject("fruits1", "apple");
    	modelAndView.addObject("fruits2", "orange");
    	modelAndView.addObject("fruits3", "lemon");
    	modelAndView.addObject("fruits4", "lime");
    	modelAndView.addObject("fruits5", "mango");

    	LOGGER.debug("EgovUtlJsonController EgovUtlJsonInquire END=========");

    	return modelAndView;
    }
    /**
	 * json ?ㅺ굔議고쉶
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/utl/jso/EgovUtlJsonMultiInquire.do",method = RequestMethod.GET)
    public String selectUtlJsonMultiInquire(@RequestParam Map<?, ?> commandMap)  throws Exception {
        return "egovframework/com/utl/jso/EgovUtlJsonMultiInquire";
    }
    @RequestMapping(value="/utl/jso/EgovUtlJsonMultiInquire.do",method = RequestMethod.POST)
    public ModelAndView selectUtlJsonMultiInquirePost(@RequestParam Map<?, ?> commandMap)  throws Exception {
    	ModelAndView modelAndView = new ModelAndView();
    	modelAndView.setViewName("jsonView");
    	LOGGER.debug("EgovUtlJsonController selectUtlJsonMultiInquire START=========");

    	LOGGER.debug("commandMap>"+commandMap);

    	modelAndView.addObject("fruits1", "apple");
    	modelAndView.addObject("fruits2", "orange");
    	modelAndView.addObject("fruits3", "lemon");
    	modelAndView.addObject("fruits4", "lime");
    	modelAndView.addObject("fruits5", "mango");

    	Map<String, String> mp = new HashMap<>();
    	mp.put("fruits1", "apple");
    	mp.put("fruits2", "orange");
    	mp.put("fruits3", "lemon");
    	mp.put("fruits4", "lime");
    	mp.put("fruits5", "mango");

    	List<Map<String, String>> list = new ArrayList<>();
    	list.add(mp);
    	list.add(mp);
    	list.add(mp);
    	list.add(mp);
    	list.add(mp);

    	modelAndView.addObject("list", list);
    	LOGGER.debug("EgovUtlJsonController selectUtlJsonMultiInquire END=========");

    	return modelAndView;
    }

}