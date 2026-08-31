#include <iostream>
#include <version>

#if __has_include(<print>)
#include <print>
#endif

int main() {
    constexpr int score = 12;
#if defined(__cpp_lib_print)
    std::println("score = {}", score);
#else
    std::cout << "score = " << score << '\n';
#endif
}
