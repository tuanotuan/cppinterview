#include <iostream>
#include <source_location>
#include <version>

#if __has_include(<stacktrace>)
#include <stacktrace>
#endif

void log_call(
    std::source_location where = std::source_location::current()) {
    std::cout << "function=" << where.function_name() << '\n';
}

int main() {
    log_call();
#if defined(__cpp_lib_stacktrace)
    std::cout << "stacktrace supported\n";
#else
    std::cout << "stacktrace unavailable\n";
#endif
}
