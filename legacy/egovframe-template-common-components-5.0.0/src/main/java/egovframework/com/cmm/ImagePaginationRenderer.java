package egovframework.com.cmm;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.AbstractPaginationRenderer;
import org.springframework.web.context.ServletContextAware;

import jakarta.servlet.ServletContext;
/**
 * ImagePaginationRenderer.java ?대옒??
 *
 * @author ?쒖???
 * @since 2011. 9. 16.
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    -------------    ----------------------
 *   2011. 9. 16.   ?쒖???      ?대?吏 寃쎈줈??ContextPath異붽?
 *   2016. 6. 17.   ?λ룞??      ?쒖??꾨젅?꾩썙??v3.6 由щ돱??
 * </pre>
 */
public class ImagePaginationRenderer extends AbstractPaginationRenderer implements ServletContextAware{

	@SuppressWarnings("unused")
	private ServletContext servletContext;

	public ImagePaginationRenderer() {

	}

	public void initVariables(){

		firstPageLabel    = "<li class=\"first\"><a href=\"?pageIndex={1}\" onclick=\"{0}({1});return false; \">泥??섏씠吏</a></li>";
		previousPageLabel = "<li class=\"prev\"><a href=\"?pageIndex={1}\" onclick=\"{0}({1});return false; \">?댁쟾 ?섏씠吏</a></li>";

        currentPageLabel  = "<li class=\"current\"><a onClick=\"return false;\">{0}</a></li>";
        otherPageLabel    = "<li><a href=\"?pageIndex={1}\" onclick=\"{0}({1});return false; \">{2}</a></li>";

        nextPageLabel    = "<li class=\"next\"><a href=\"?pageIndex={1}\" onclick=\"{0}({1});return false; \">?ㅼ쓬 ?섏씠吏</a></li>";
        lastPageLabel    = "<li class=\"last\"><a href=\"?pageIndex={1}\" onclick=\"{0}({1});return false; \">???섏씠吏</a></li>";

	}



	@Override
	public void setServletContext(ServletContext servletContext) {
		this.servletContext = servletContext;
		initVariables();
	}

}
