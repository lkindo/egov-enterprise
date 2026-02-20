package egovframework.com.utl.slm;

import jakarta.servlet.http.HttpSessionBindingEvent;
import jakarta.servlet.http.HttpSessionBindingListener;

/**
 * @Class Name : EgovHttpSessionBindingListener.java
 * @Description : 以묐났 濡쒓렇??諛⑹?瑜??꾪빐 ?ъ슜?먯쓽 濡쒓렇???꾩씠?붿? ?몄뀡???쒖뼱?섎뒗 援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.30	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author YJ Kwon
 * @since 2014.09.30
 * @version 3.5
 */
public class EgovHttpSessionBindingListener implements HttpSessionBindingListener {

	/**
	 * ?ъ슜?먯쓽 濡쒓렇???몄뀡??EgovHttpSessionBindingListener媛 諛붿씤?⑸맆 ???먮룞 ?몄텧?섎뒗 硫붿냼?쒕줈,
	 * ?ъ슜???몄뀡???대? 議댁옱?섎뒗吏瑜?寃?ы븯???섎굹???댄뵆由ъ??댁뀡 ?댁뿉???섎굹???몄뀡留??좎??섎룄濡??쒕떎
	 * */
	@Override
	public void valueBound(HttpSessionBindingEvent event) {
		if (EgovMultiLoginPreventor.findByLoginId(event.getName())) {
			EgovMultiLoginPreventor.invalidateByLoginId(event.getName());
		}
		EgovMultiLoginPreventor.loginUsers.put(event.getName(), event.getSession());
	}

	/**
	 *
	 * 濡쒓렇?꾩썐 ?뱀? ?몄뀡??꾩븘???ㅼ젙???곕씪 ?ъ슜???몄뀡?쇰줈遺??
	 * EgovHttpSessionBindingListener媛 ?쒓굅?????먮룞 ?몄텧?섎뒗 硫붿냼?쒕줈,
	 * ?ъ슜?먯쓽 濡쒓렇???꾩씠?붿뿉 ?대떦?섎뒗 ?몄뀡??ConcurrentHashMap?먯꽌 紐⑤몢 ?쒓굅?쒕떎
	 * */
	@Override
	public void valueUnbound(HttpSessionBindingEvent event) {
		EgovMultiLoginPreventor.loginUsers.remove(event.getName(), event.getSession());
	}
}
