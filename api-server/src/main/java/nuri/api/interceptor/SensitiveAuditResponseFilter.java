package nuri.api.interceptor;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Preserve output IO failure evidence even if an MVC resolver consumes the exception after commitment. */
@Component
public class SensitiveAuditResponseFilter extends OncePerRequestFilter {
    static final String OUTPUT_FAILED = "nuri.audit.outputFailed";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(request, new HttpServletResponseWrapper(response) {
            private ServletOutputStream output;
            @Override public ServletOutputStream getOutputStream() throws IOException {
                if (output == null) {
                    ServletOutputStream delegate = super.getOutputStream();
                    output = new ServletOutputStream() {
                        @Override public boolean isReady() { return delegate.isReady(); }
                        @Override public void setWriteListener(WriteListener listener) { delegate.setWriteListener(listener); }
                        @Override public void write(int value) throws IOException { attempt(() -> delegate.write(value)); }
                        @Override public void write(byte[] value, int offset, int length) throws IOException { attempt(() -> delegate.write(value, offset, length)); }
                        @Override public void flush() throws IOException { attempt(delegate::flush); }
                        @Override public void close() throws IOException { attempt(delegate::close); }
                        private void attempt(IoOperation operation) throws IOException {
                            try { operation.run(); }
                            catch (IOException failure) { request.setAttribute(OUTPUT_FAILED, Boolean.TRUE); throw failure; }
                        }
                    };
                }
                return output;
            }
        });
    }

    @FunctionalInterface
    private interface IoOperation { void run() throws IOException; }
}
