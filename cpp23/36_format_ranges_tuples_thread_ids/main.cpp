#include <iostream>
#include <thread>
#include <tuple>
#include <vector>
#include <version>

#if __has_include(<format>)
#include <format>
#endif

int main() {
    std::vector values{1, 2, 3};
    std::tuple pair{7, 8};

#if defined(__cpp_lib_format_ranges) && defined(__cpp_lib_formatters)
    std::cout << std::format("values={} pair={} thread={}",
                             values, pair, std::this_thread::get_id())
              << '\n';
#else
    (void)values;
    (void)pair;
    std::cout << "C++23 structured formatters unavailable\n";
#endif
}
