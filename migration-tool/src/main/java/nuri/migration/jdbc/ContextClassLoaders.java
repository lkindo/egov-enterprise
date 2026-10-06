package nuri.migration.jdbc;

import java.util.concurrent.Callable;

/** 외부 driver 호출 동안만 thread context ClassLoader를 격리 loader로 바꾸고 원래 loader로 되돌린다. */
final class ContextClassLoaders {

    private ContextClassLoaders() {}

    static <T> T call(ClassLoader loader, Callable<T> action) throws Exception {
        Thread thread = Thread.currentThread();
        ClassLoader previous = thread.getContextClassLoader();
        try {
            thread.setContextClassLoader(loader);
            return action.call();
        } finally {
            thread.setContextClassLoader(previous);
        }
    }
}
