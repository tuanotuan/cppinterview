#include <iostream>
#include <version>

#if __has_include(<generator>)
#include <generator>
#endif

#if defined(__cpp_lib_generator)
std::generator<int> count_to(int stop) {
    for (int value = 1; value <= stop; ++value)
        co_yield value;
}
#endif

int main() {
#if defined(__cpp_lib_generator)
    for (int value : count_to(4))
        std::cout << value << ' ';
    std::cout << '\n';
#else
    std::cout << "std::generator unavailable\n";
#endif
}
