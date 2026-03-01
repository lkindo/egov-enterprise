package egovframework.com.cmm;

import java.io.IOException;
import java.io.Reader;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;

import jakarta.servlet.jsp.JspException;
import jakarta.servlet.jsp.JspWriter;
import jakarta.servlet.jsp.PageContext;
import jakarta.servlet.jsp.tagext.BodyTagSupport;

/**
 * Cross-Site Scripting 泥댄겕?섏뿬 媛믪쓣 ?섎룎??諛쏅뒗 ?몃뱾??JSP TLD, ?먮컮?먯꽌 ?ъ슜媛??
 *
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.11.09
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.11.09  ?λ룞??         理쒖큹 ?앹꽦
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.05.22  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃), CloseResource(由ъ냼???リ린), AssignmentInOperand(?쇱뿰?곗옄???좊떦)
 *
 *      </pre>
 */
@SuppressWarnings("serial")
public class EgovComCrossSiteHndlr extends BodyTagSupport {

	/*
	 * (One almost wishes XML and JSP could support "anonymous tags," given the
	 * amount of trouble we had naming this one!) :-) - sb
	 */

	// *********************************************************************
	// Internal state

	protected Object value; // tag attribute
	protected String def; // tag attribute
	protected boolean escapeXml; // tag attribute
	private boolean needBody; // non-space body needed?

	// *********************************************************************
	// Construction and initialization

	private final String sDiffChar = "()[]{}\"',:;= \t\r\n%!+-";
	private final String sArrDiffChar[] = { "&#40;", "&#41;", "&#91;", "&#93;", "&#123;", "&#125;", "&#34;", "&#39;",
			"&#44;", "&#58;", "&#59;", "&#61;", " ", "\t", // " ","\t",
			"\r", "\n", // "\r","\n",
			"&#37;", "&#33;", "&#43;", "&#45;" };

	// 23.06.08 taglibs ?쇱씠釉뚮윭由?痍⑥빟???⑥튂 媛?蹂寃쎌궗??源?쒖?
	public static final int HIGHEST_SPECIAL = '>';
	public static char[][] specialCharactersRepresentation = new char[HIGHEST_SPECIAL + 1][];
	static {
		specialCharactersRepresentation['&'] = "&amp;".toCharArray();
		specialCharactersRepresentation['<'] = "&lt;".toCharArray();
		specialCharactersRepresentation['>'] = "&gt;".toCharArray();
		specialCharactersRepresentation['"'] = "&#034;".toCharArray();
		specialCharactersRepresentation['\''] = "&#039;".toCharArray();
	}

	/**
	 * Constructs a new handler. As with TagSupport, subclasses should not provide
	 * other constructors and are expected to call the superclass constructor.
	 */
	public EgovComCrossSiteHndlr() {
		super();
		init();
	}

	// resets local state
	private void init() {
		value = def = null;
		escapeXml = true;
		needBody = false;
	}

	// Releases any resources we may have (or inherit)
	@Override
	public void release() {
		super.release();
		init();
	}

	// *********************************************************************
	// Tag logic

	// evaluates 'value' and determines if the body should be evaluted
	@Override
	public int doStartTag() throws JspException {
		needBody = false; // reset state related to 'default'
		this.bodyContent = null; // clean-up body (just in case container is pooling tag handlers)
		JspWriter out = pageContext.getOut(); // NOPMD - CloseResource
		try {
			// print value if available; otherwise, try 'default'
			if (value != null) {
				String sWriteEscapedXml = getWriteEscapedXml();
				out.print(sWriteEscapedXml);
				return SKIP_BODY;
			} else {
				// if we don't have a 'default' attribute, just go to the body
				// 2022.11.11 ?쒗걧?댁퐫??泥섎━
				if (StringUtils.isEmpty(def)) {
					needBody = true;
					return EVAL_BODY_BUFFERED;
				} else {
					out(pageContext, escapeXml, def);
				}
				return SKIP_BODY;
			}
		} catch (IOException ex) {
			throw new JspException(ex.toString(), ex);
		}
	}

	// prints the body if necessary; reports errors
	@Override
	public int doEndTag() throws JspException {
		try {
			if (!needBody) {
				return EVAL_PAGE; // nothing more to do
			}
			// trim and print out the body
			if (bodyContent != null && bodyContent.getString() != null) {
				out(pageContext, escapeXml, bodyContent.getString().trim());
			}
			return EVAL_PAGE;
		} catch (IOException ex) {
			throw new JspException(ex.toString(), ex);
		}
	}

	// *********************************************************************
	//
                     utility methods

	/**
	 * Outputs <tt>text</tt> to <tt>pageContext</tt>'s current JspWriter. If
	 * <tt>escapeXml</tt> is true, performs the following substring replacements (to
	 * facilitate output to XML/HTML pages):
	 *
	 * & -> &amp; < -> &lt; > -> &gt; " -> &#034; ' -> &#039;
	 *
	 * See also Util.escapeXml().
	 */
	public static void out(PageContext pageContext, boolean escapeXml, Object obj) throws IOException {
		JspWriter w = pageContext.getOut(); // NOPMD - CloseResource
		if (!escapeXml) {
			// write chars as is
			if (obj instanceof Reader) {
				Reader reader = (Reader) obj;
				w.write(IOUtils.toString(reader));
			} else {
				w.write(obj.toString());
			}
		} else {
			// escape XML chars
			if (obj instanceof Reader) {
				Reader reader = (Reader) obj;
				String text = IOUtils.toString(reader);
				writeEscapedXml(text.toCharArray(), text.length(), w);
			} else {
				String text = obj.toString();
				writeEscapedXml(text.toCharArray(), text.length(), w);
			}
		}
	}

	public static void out2(PageContext pageContext, boolean escapeXml, Object obj) throws IOException {
		JspWriter w = pageContext.getOut(); // NOPMD - CloseResource
		w.write(obj.toString());
	}

	/**
	 *
	 * Optimized to create no extra objects and write directly to the JspWriter
	 * using blocks of escaped and unescaped characters
	 *
	 */
	private static void writeEscapedXml(char[] buffer, int length, JspWriter w) throws IOException {
		int start = 0;
		for (int i = 0; i < length; i++) {
			char c = buffer[i];
			if (c <= HIGHEST_SPECIAL) {
				char[] escaped = specialCharactersRepresentation[c];
				if (escaped != null) {
					// add unescaped portion
					if (start < i) {
						w.write(buffer, start, i - start);
					}
					// add escaped xml
					w.write(escaped);
					start = i + 1;
				}
			}
		}
		// add rest of unescaped portion
		if (start < length) {
			w.write(buffer, start, length - start);
		}
	}

	/**
	 *
	 * Optimized to create no extra objects and write directly to the JspWriter
	 * using blocks of escaped and unescaped characters
	 *
	 */
	@SuppressWarnings("unused")
	private String getWriteEscapedXml() throws IOException {
		Object obj = this.value;
		boolean booleanDiff = false;
		String sRtn = "";
		String text = obj.toString();
		int start = 0;
		int length = text.length();
		char[] buffer = text.toCharArray();
		char[] cDiffChar = this.sDiffChar.toCharArray();

		for (int i = 0; i < length; i++) {
			char c = buffer[i];
			booleanDiff = false;
			for (int k = 0; k < cDiffChar.length; k++) {
				if (c == cDiffChar[k]) {
					sRtn = sRtn + sArrDiffChar[k];
					booleanDiff = true;
					continue;
				}
			}

			if (booleanDiff) {
				continue;
			}

			if (c <= HIGHEST_SPECIAL) {
				char[] escaped = specialCharactersRepresentation[c];
				if (escaped != null) {
					for (int j = 0; j < escaped.length; j++) {
						sRtn = sRtn + escaped[j];
					}
					start = i + 1;
				} else {
					sRtn = sRtn + c;
				}
			} else {
				sRtn = sRtn + c;
			}
		}

		return sRtn;
	}

	/**
	 *
	 * Optimized to create no extra objects and write directly to the JspWriter
	 * using blocks of escaped and unescaped characters
	 *
	 */
	@SuppressWarnings("unused")
	private String getWriteEscapedXml(String sWriteString) throws IOException {
		Object obj = sWriteString;
		boolean booleanDiff = false;
		String text = obj.toString();
		String sRtn = "";
		int start = 0;
		int length = text.length();
		char[] buffer = text.toCharArray();
		char[] cDiffChar = this.sDiffChar.toCharArray();

		for (int i = 0; i < length; i++) {
			char c = buffer[i];
			booleanDiff = false;
			for (int k = 0; k < cDiffChar.length; k++) {
				if (c == cDiffChar[k]) {
					sRtn = sRtn + sArrDiffChar[k];
					booleanDiff = true;
					continue;
				}
			}

			if (booleanDiff) {
				continue;
			}

			if (c <= HIGHEST_SPECIAL) {
				char[] escaped = specialCharactersRepresentation[c];
				if (escaped != null) {
					for (int j = 0; j < escaped.length; j++) {
						sRtn = sRtn + escaped[j];
					}
					start = i + 1;
				} else {
					sRtn = sRtn + c;
				}
			} else {
				sRtn = sRtn + c;
			}
		}

		return sRtn;
	}

	// for tag attribute
	public void setValue(Object value) {
		this.value = value;
	}

	// for tag attribute
	public void setDefault(String def) {
		this.def = def;
	}

	// for tag attribute
	public void setEscapeXml(boolean escapeXml) {
		this.escapeXml = escapeXml;
	}

}
